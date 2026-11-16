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
  postSalesInvoiceDraft,
  updateSalesInvoiceDraft,
} from '../../../redux/salesInvoices/salesInvoices.actions'
import type { SalesInvoicesState } from '../../../redux/salesInvoices/salesInvoices.reducer'
import { draftInvoice, salesInvoiceFormValues, salesInvoiceOptions } from '../../../test/fixtures/salesInvoices'
import { makeSalesInvoiceState, renderWithProviders } from '../../../test/test-utils'
import type { SalesInvoice } from '../../../types/salesInvoices'

// The form loads the customers, salespeople and vehicles on mount; without a saga the helper answers it
function renderForm(overrides: Partial<SalesInvoicesState> = {}, { options = true, draft }: { options?: boolean; draft?: SalesInvoice } = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<SalesInvoiceForm draft={draft} onClose={onClose} />, { preloadedState: makeSalesInvoiceState(overrides) })
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

const SAVE_TYPES: readonly string[] = [
  createSalesInvoice(salesInvoiceFormValues).type,
  postSalesInvoice(salesInvoiceFormValues).type,
  updateSalesInvoiceDraft({ id: '', values: salesInvoiceFormValues }).type,
  postSalesInvoiceDraft({ id: '', values: salesInvoiceFormValues }).type,
]
const saves = (actions: UnknownAction[]) => actions.filter((action) => SAVE_TYPES.includes(action.type))

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

    it('starts on Financing, collecting nothing and asking for no deposit account', () => {
      renderForm()
      expect(screen.getByRole('radio', { name: 'Financing' })).toBeChecked()
      expect(screen.queryByRole('combobox', { name: /Deposit To/ })).not.toBeInTheDocument()
      expect(valueOf(sectionOf('Invoice Summary'), 'Paid on Invoice')).toHaveTextContent('$0.00')
    })

    it('collects the whole total on Bank terms and deposits it to the picked account', async () => {
      const { actions, user } = renderForm()
      await fillValidForm(user)
      await user.click(screen.getByRole('radio', { name: 'Bank' }))

      expect(valueOf(sectionOf('Invoice Summary'), 'Paid on Invoice')).toHaveTextContent('$33,120.00')
      expect(valueOf(sectionOf('Invoice Summary'), 'Balance Due')).toHaveTextContent('$0.00')

      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))
      expect(screen.getByText('Select the account the payment is deposited to')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await pick(user, /^Deposit To/, 'Chase Bank — Operating Checking (****4521)')
      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Received Now').nextElementSibling).toHaveTextContent('$33,120.00')
      await user.click(within(dialog).getByRole('button', { name: 'Confirm & Post' }))

      expect(saves(actions)).toEqual([
        postSalesInvoice({ ...expectedValues(), paymentTerms: 'bank', amountReceived: '33120.00', bankAccountId: '1' }),
      ])
    })

    it('requires a partial payment above zero and below the total', async () => {
      const { actions, user } = renderForm()
      await fillValidForm(user)
      await user.click(screen.getByRole('radio', { name: 'Partial' }))
      await pick(user, /^Deposit To/, 'Chase Bank — Operating Checking (****4521)')
      const amount = screen.getByRole('spinbutton', { name: /Amount Received/ })

      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))
      expect(screen.getByText('Enter the amount received')).toBeInTheDocument()

      await user.type(amount, '33120')
      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))
      expect(screen.getByText('Partial payment must be less than the invoice total.')).toBeInTheDocument()

      await user.clear(amount)
      await user.type(amount, '5000')
      expect(valueOf(sectionOf('Invoice Summary'), 'Balance Due')).toHaveTextContent('$28,120.00')
      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm & Post' }))

      expect(saves(actions)).toEqual([
        postSalesInvoice({ ...expectedValues(), paymentTerms: 'partial', amountReceived: '5000.00', bankAccountId: '1' }),
      ])
    })

    it('does not check the payment for a draft, which records none', async () => {
      const { actions, user } = renderForm()
      await fillValidForm(user)
      await user.click(screen.getByRole('radio', { name: 'Bank' }))
      await user.click(screen.getByRole('button', { name: 'Save Draft' }))
      expect(saves(actions)).toEqual([
        createSalesInvoice({ ...expectedValues(), paymentTerms: 'bank', amountReceived: '33120.00', bankAccountId: '' }),
      ])
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

  describe('editing a draft', () => {
    // The draft's own values, as the form sends them back (Financing, nothing received)
    const draftValues = { ...salesInvoiceFormValues, invoiceDate: '2026-11-01', dueDate: '2026-12-01' }

    it('opens as "Edit" with the draft\'s number, picks and dates filled in', () => {
      renderForm({}, { draft: draftInvoice })
      expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Edit INV-2026-0008')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /Invoice Number/ })).toHaveValue('INV-2026-0008')
      expect(combobox(/^Customer/)).toHaveTextContent('John Smith')
      expect(combobox(/^Salesperson/)).toHaveTextContent('Maria Lopez')
      expect(combobox(/^Vehicle/)).toHaveTextContent(CAMRY)
      expect(invoiceDate()).toHaveValue('2026-11-01')
      expect(dueDate()).toHaveValue('2026-12-01')
      expect(valueOf(sectionOf('Invoice Summary'), 'Total')).toHaveTextContent('$33,120.00')
    })

    it('starts with the draft\'s discount', () => {
      renderForm({}, { draft: { ...draftInvoice, discount: 250 } })
      expect(discount()).toHaveValue(250)
    })

    it('saves the changes to the draft with Save Changes', async () => {
      const { actions, user } = renderForm({}, { draft: draftInvoice })
      await user.type(discount(), '100')
      await user.click(screen.getByRole('button', { name: 'Save Changes' }))
      expect(saves(actions)).toEqual([updateSalesInvoiceDraft({ id: '8', values: { ...draftValues, discount: '100' } })])
    })

    it('posts the draft itself, with the payment, instead of creating another invoice', async () => {
      const { actions, user } = renderForm({}, { draft: draftInvoice })
      await user.click(screen.getByRole('radio', { name: 'Bank' }))
      await pick(user, /^Deposit To/, 'Chase Bank — Operating Checking (****4521)')
      await user.click(screen.getByRole('button', { name: 'Post Invoice' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm & Post' }))

      expect(saves(actions)).toEqual([postSalesInvoiceDraft({
        id: '8',
        values: { ...draftValues, paymentTerms: 'bank', amountReceived: '33120.00', bankAccountId: '1' },
      })])
    })

    it('shows "Saving…" while saving changes', () => {
      renderForm({ saveMode: 'update', saveStatus: 'loading' }, { draft: draftInvoice })
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    })

    it('says the changes could not be saved', () => {
      renderForm({ saveMode: 'update', saveStatus: 'error', saveError: 'This sales invoice no longer exists.' }, { draft: draftInvoice })
      expect(screen.getByText("Couldn't save changes")).toBeInTheDocument()
      expect(screen.getByText('This sales invoice no longer exists.')).toBeInTheDocument()
    })

    it('keeps the draft\'s vehicle on offer when it is not in the available list', () => {
      renderForm({}, { draft: { ...draftInvoice, vehicleId: '99', vehicle: 'Honda Civic', vin: 'ITEST-D39F9810000', sellingPrice: 18000, vehicleTotalCost: 15250 } })
      expect(combobox(/^Vehicle/)).toHaveTextContent('Honda Civic (VIN: ...810000)')
      expect(valueOf(sectionOf('Profitability'), 'Gross Profit')).toHaveTextContent('$2,750.00')
    })
  })
})
