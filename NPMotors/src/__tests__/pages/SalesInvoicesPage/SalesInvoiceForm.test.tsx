import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import type { UnknownAction } from 'redux'
import { describe, expect, it, vi } from 'vitest'
import { SalesInvoiceForm } from '../../../pages/SalesInvoicesPage/SalesInvoiceForm'
import { addDaysIso, todayIso } from '../../../pages/SalesInvoicesPage/salesInvoiceMetrics'
import {
  createSalesInvoice,
  loadSalesInvoiceOptions,
  loadSalesInvoiceOptionsFailure,
  loadSalesInvoiceOptionsSuccess,
  postSalesInvoice,
} from '../../../redux/salesInvoices/salesInvoices.actions'
import type { SalesInvoicesState } from '../../../redux/salesInvoices/salesInvoices.reducer'
import { salesInvoiceFormValues, salesInvoiceOptions } from '../../../test/fixtures/salesInvoices'
import { makeSalesInvoiceState, renderWithProviders } from '../../../test/test-utils'

// The form loads the customers, salespeople and vehicles on mount; without a saga the helper answers it
function renderForm(overrides: Partial<SalesInvoicesState> = {}, { options = true } = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<SalesInvoiceForm onClose={onClose} />, { preloadedState: makeSalesInvoiceState(overrides) })
  if (options) act(() => { result.store.dispatch(loadSalesInvoiceOptionsSuccess(salesInvoiceOptions)) })
  return { ...result, onClose }
}

const combobox = (label: RegExp) => screen.getByRole('combobox', { name: label })
const invoiceDate = () => screen.getByLabelText(/Invoice Date/)
const dueDate = () => screen.getByLabelText(/Due Date/)
const discount = () => screen.getByRole('spinbutton', { name: /Discount/ })

async function pick(user: UserEvent, label: RegExp, option: string) {
  await user.click(combobox(label))
  await user.click(screen.getByRole('option', { name: option }))
}

const CAMRY = '2024 Toyota Camry — Silver (VIN: ...000024)'

async function fillValidForm(user: UserEvent) {
  await pick(user, /^Customer/, 'John Smith')
  await pick(user, /^Salesperson/, 'Maria Lopez')
  await pick(user, /^Vehicle/, CAMRY)
}

// The form's own default dates, so the expected payload matches whatever day the test runs
const expectedValues = () => ({ ...salesInvoiceFormValues, invoiceDate: todayIso(), dueDate: addDaysIso(30) })

const saves = (actions: UnknownAction[]) =>
  actions.filter((action) => action.type === createSalesInvoice(salesInvoiceFormValues).type || action.type === postSalesInvoice(salesInvoiceFormValues).type)

const sectionOf = (heading: string) => {
  const section = screen.getByRole('heading', { name: heading }).closest('section')
  if (!section) throw new Error(`No section for ${heading}`)
  return section
}

const valueOf = (container: HTMLElement, label: string) => {
  const value = within(container).getByText(label, { selector: 'dt' }).nextElementSibling
  if (!(value instanceof HTMLElement)) throw new Error(`No value for ${label}`)
  return value
}

describe('SalesInvoiceForm', () => {
  it('loads the lookups and starts with today, a 30-day due date and empty dropdowns', () => {
    const { actions } = renderForm()

    expect(actions).toContainEqual(loadSalesInvoiceOptions())
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('New Sales Invoice')).toBeInTheDocument()
    expect(screen.getByText(/Posting this invoice will automatically create/)).toBeInTheDocument()
    expect(invoiceDate()).toHaveValue(todayIso())
    expect(dueDate()).toHaveValue(addDaysIso(30))
    expect(dueDate()).toHaveAttribute('min', todayIso())
    expect(combobox(/^Customer/)).toHaveTextContent('Select customer...')
    expect(combobox(/^Salesperson/)).toHaveTextContent('Select salesperson...')
    expect(combobox(/^Vehicle/)).toHaveTextContent('Select available vehicle...')
    expect(screen.getByPlaceholderText('Auto-generated')).toHaveAttribute('readonly')
  })

  it('shows only the fees in the summary and no profitability before a vehicle is picked', () => {
    renderForm()

    const summary = sectionOf('Invoice Summary')
    expect(valueOf(summary, 'Sale Price')).toHaveTextContent('$0.00')
    expect(valueOf(summary, 'Tax (8%)')).toHaveTextContent('$0.00')
    expect(valueOf(summary, 'Fees')).toHaveTextContent('$450.00')
    expect(valueOf(summary, 'Total')).toHaveTextContent('$450.00')
    expect(screen.queryByRole('heading', { name: 'Profitability' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Accounting Entries (Auto)' })).not.toBeInTheDocument()
  })

  it('disables the dropdowns while the lookups load', () => {
    renderForm({}, { options: false })
    for (const label of [/^Customer/, /^Salesperson/, /^Vehicle/]) {
      expect(combobox(label)).toBeDisabled()
      expect(combobox(label)).toHaveTextContent('Loading…')
    }
  })

  it('shows the lookup error and retries', async () => {
    const { store, actions, user } = renderForm({}, { options: false })
    act(() => { store.dispatch(loadSalesInvoiceOptionsFailure('Customers could not be loaded.')) })

    expect(screen.getByText("Couldn't load the form's lists")).toBeInTheDocument()
    expect(screen.getByText('Customers could not be loaded.')).toBeInTheDocument()
    expect(combobox(/^Customer/)).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadSalesInvoiceOptions().type)).toHaveLength(2)
  })

  it('says so when no vehicles are for sale', () => {
    const { store } = renderForm({}, { options: false })
    act(() => { store.dispatch(loadSalesInvoiceOptionsSuccess({ ...salesInvoiceOptions, vehicles: [] })) })
    expect(combobox(/^Vehicle/)).toHaveTextContent('No vehicles available for sale')
  })

  it('offers active customers only, the salespeople and the available vehicles', async () => {
    const { user } = renderForm()

    await user.click(combobox(/^Customer/))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['John Smith'])
    await user.click(screen.getByRole('option', { name: 'John Smith' }))

    await user.click(combobox(/^Salesperson/))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Maria Lopez'])
    await user.click(screen.getByRole('option', { name: 'Maria Lopez' }))

    await user.click(combobox(/^Vehicle/))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([CAMRY])
  })

  it('prices the invoice from the picked vehicle and shows the profit and accounting entries', async () => {
    const { user } = renderForm()
    await fillValidForm(user)

    expect(screen.getByText('VIN: 4T1G11AK0RU000024')).toBeInTheDocument()
    expect(screen.getByLabelText(/Sale Price/)).toHaveValue('30250.00')

    const summary = sectionOf('Invoice Summary')
    expect(valueOf(summary, 'Sale Price')).toHaveTextContent('$30,250.00')
    expect(valueOf(summary, 'Tax (8%)')).toHaveTextContent('$2,420.00')
    expect(valueOf(summary, 'Total')).toHaveTextContent('$33,120.00')
    expect(valueOf(summary, 'Balance Due')).toHaveTextContent('$33,120.00')

    const profit = sectionOf('Profitability')
    expect(valueOf(profit, 'Cost of Vehicle')).toHaveTextContent('-$26,800.00')
    expect(valueOf(profit, 'Gross Profit')).toHaveTextContent('$3,450.00')
    expect(valueOf(profit, 'Margin')).toHaveTextContent('11.4%')

    const entries = sectionOf('Accounting Entries (Auto)')
    expect(valueOf(entries, 'Accounts Receivable Dr')).toHaveTextContent('$33,120.00')
    expect(valueOf(entries, 'Vehicle Sales Cr')).toHaveTextContent('$30,250.00')
    expect(valueOf(entries, 'Sales Tax Payable Cr')).toHaveTextContent('$2,420.00')
    expect(valueOf(entries, 'Cost of Vehicles Sold Dr')).toHaveTextContent('$26,800.00')
  })

  it('takes the discount off the subtotal, total and profit', async () => {
    const { user } = renderForm()
    await fillValidForm(user)
    await user.type(discount(), '250')

    const summary = sectionOf('Invoice Summary')
    expect(valueOf(summary, 'Discount')).toHaveTextContent('-$250.00')
    expect(valueOf(summary, 'Subtotal')).toHaveTextContent('$30,000.00')
    expect(valueOf(summary, 'Total')).toHaveTextContent('$32,870.00')
    expect(valueOf(sectionOf('Profitability'), 'Gross Profit')).toHaveTextContent('$3,200.00')
  })

  describe('validation', () => {
    it('requires a customer, salesperson and vehicle even for a draft', async () => {
      const { actions, user } = renderForm()
      await user.click(screen.getByRole('button', { name: 'Save Draft' }))

      expect(screen.getByText('Select a customer')).toBeInTheDocument()
      expect(screen.getByText('Select a salesperson')).toBeInTheDocument()
      expect(screen.getByText('Select a vehicle')).toBeInTheDocument()
      expect(saves(actions)).toHaveLength(0)
    })

    it('clears a field error once the field is filled', async () => {
      const { user } = renderForm()
      await user.click(screen.getByRole('button', { name: 'Save Draft' }))
      await pick(user, /^Customer/, 'John Smith')
      expect(screen.queryByText('Select a customer')).not.toBeInTheDocument()
      expect(screen.getByText('Select a salesperson')).toBeInTheDocument()
    })

    it('requires an invoice date', async () => {
      const { actions, user } = renderForm()
      await fillValidForm(user)
      fireEvent.change(invoiceDate(), { target: { value: '' } })
      await user.click(screen.getByRole('button', { name: 'Save Draft' }))

      expect(screen.getByText('Invoice date is required')).toBeInTheDocument()
      expect(saves(actions)).toHaveLength(0)
    })

    it('rejects a due date before the invoice date', async () => {
      const { user } = renderForm()
      await fillValidForm(user)
      fireEvent.change(invoiceDate(), { target: { value: '2026-11-10' } })
      fireEvent.change(dueDate(), { target: { value: '2026-11-01' } })
      await user.click(screen.getByRole('button', { name: 'Save Draft' }))

      expect(screen.getByText("Due date can't be before the invoice date")).toBeInTheDocument()
    })

    it.each([
      ['a negative discount', '-5', 'Enter a discount of 0 or more'],
      ['a discount above the sale price', '30250.01', "Discount can't exceed the sale price"],
      ['a discount above the API limit', '10000000000000', 'Discount is too large'],
    ])('rejects %s', async (_, value, message) => {
      const { actions, user } = renderForm()
      await fillValidForm(user)
      await user.type(discount(), value)
      await user.click(screen.getByRole('button', { name: 'Save Draft' }))

      expect(screen.getByText(message)).toBeInTheDocument()
      expect(saves(actions)).toHaveLength(0)
    })

    it('does not open the post confirmation for an invalid form', async () => {
      const { user } = renderForm()
      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))
      expect(screen.getByText('Select a customer')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('saves a draft with the computed tax and fees', async () => {
    const { actions, user } = renderForm()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Save Draft' }))
    expect(saves(actions)).toEqual([createSalesInvoice(expectedValues())])
  })

  it('sends the discount it was given', async () => {
    const { actions, user } = renderForm()
    await fillValidForm(user)
    await user.type(discount(), '250')
    await user.click(screen.getByRole('button', { name: 'Save Draft' }))
    expect(saves(actions)).toEqual([createSalesInvoice({ ...expectedValues(), discount: '250' })])
  })

  describe('Post Invoice', () => {
    it('confirms with the customer, vehicle and total before posting', async () => {
      const { actions, user } = renderForm()
      await fillValidForm(user)
      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Confirm Post Invoice')).toBeInTheDocument()
      expect(within(dialog).getByText('John Smith')).toBeInTheDocument()
      expect(within(dialog).getByText('2024 Toyota Camry')).toBeInTheDocument()
      expect(within(dialog).getByText('$33,120.00')).toBeInTheDocument()
      expect(saves(actions)).toHaveLength(0)

      await user.click(within(dialog).getByRole('button', { name: 'Confirm & Post' }))
      expect(saves(actions)).toEqual([postSalesInvoice(expectedValues())])
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('goes back to the form from the confirmation without posting', async () => {
      const { actions, user } = renderForm()
      await fillValidForm(user)
      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(saves(actions)).toHaveLength(0)
    })
  })

  describe('while saving', () => {
    it.each([
      ['draft', 'Saving…', 'Post Invoice'],
      ['post', 'Posting…', 'Save Draft'],
    ] as const)('labels the %s button and locks the form', (saveMode, busy, other) => {
      renderForm({ saveMode, saveStatus: 'loading' })

      expect(screen.getByRole('button', { name: busy })).toBeDisabled()
      expect(screen.getByRole('button', { name: other })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '← Sales Invoices' })).toBeDisabled()
      expect(screen.getByRole('group', { name: 'Invoice Details' })).toBeDisabled()
    })
  })

  describe('server errors', () => {
    it.each([
      ['draft', "Couldn't save draft"],
      ['post', "Couldn't post invoice"],
    ] as const)('shows the %s banner with the message', (saveMode, title) => {
      renderForm({ saveMode, saveStatus: 'error', saveError: 'Customer does not exist.' })
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(screen.getByText('Customer does not exist.')).toBeInTheDocument()
    })

    it('puts tax errors in the banner, since tax has no input', () => {
      renderForm({ saveMode: 'post', saveStatus: 'error', fieldErrors: { tax: 'Tax is out of range.' } })
      expect(screen.getByText("Couldn't post invoice")).toBeInTheDocument()
      expect(screen.getByText('Tax is out of range.')).toBeInTheDocument()
    })

    it('shows a field error until the field is edited', async () => {
      const { user } = renderForm({ saveMode: 'draft', saveStatus: 'error', fieldErrors: { discount: 'Discount is out of range.' } })
      expect(screen.getByText('Discount is out of range.')).toBeInTheDocument()
      expect(screen.queryByText("Couldn't save draft")).not.toBeInTheDocument()

      await user.type(discount(), '1')
      expect(screen.queryByText('Discount is out of range.')).not.toBeInTheDocument()
    })
  })

  it.each([
    ['Cancel', 'Cancel'],
    ['the breadcrumb', '← Sales Invoices'],
  ])('closes from %s', async (_, name) => {
    const { onClose, user } = renderForm()
    await user.click(screen.getByRole('button', { name }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
