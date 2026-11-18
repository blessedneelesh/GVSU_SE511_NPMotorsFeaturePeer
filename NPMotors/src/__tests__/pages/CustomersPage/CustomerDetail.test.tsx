import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CustomerDetail } from '../../../pages/CustomersPage/CustomerDetail'
import { clearCustomerSelection, selectCustomer } from '../../../redux/customers/customers.actions'
import {
  clearCustomerSalesInvoices,
  loadCustomerSalesInvoices,
  loadCustomerSalesInvoicesFailure,
  loadCustomerSalesInvoicesSuccess,
} from '../../../redux/salesInvoices/salesInvoices.actions'
import { customer, sparseCustomer } from '../../../test/fixtures/customers'
import { customerSalesInvoices } from '../../../test/fixtures/salesInvoices'
import { makeState, renderWithProviders } from '../../../test/test-utils'
import type { Customer } from '../../../types/customers'
import type { CustomerSalesInvoice } from '../../../types/salesInvoices'

const renderLoaded = (selected: Customer, selectedId = selected.id || 'X') =>
  renderWithProviders(<CustomerDetail />, { preloadedState: makeState({ selectedId, selected, detailStatus: 'success' }) })

// Opening the customer dispatches the invoice load; with no saga running, tests dispatch the answer themselves
const answerInvoices = (
  store: { dispatch: (action: ReturnType<typeof loadCustomerSalesInvoicesSuccess>) => unknown },
  customerId: string,
  invoices: CustomerSalesInvoice[] = customerSalesInvoices,
) => {
  act(() => { store.dispatch(loadCustomerSalesInvoicesSuccess({ customerId, invoices })) })
}

const cellsOf = (table: HTMLElement) =>
  within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))

describe('CustomerDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<CustomerDetail />, { preloadedState: makeState({ selectedId: 'C001', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading customer…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Customer')).toBeInTheDocument()
  })

  it('shows the error and retries the same customer', async () => {
    const { actions, user } = renderWithProviders(<CustomerDetail />, {
      preloadedState: makeState({ selectedId: 'C001', detailStatus: 'error', detailError: 'This customer no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load customer")).toBeInTheDocument()
    expect(screen.getByText('This customer no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([loadCustomerSalesInvoices('C001'), selectCustomer('C001')])
  })

  it('renders the profile and stats', () => {
    renderLoaded(customer)

    expect(screen.getByRole('heading', { name: 'John Smith' })).toBeInTheDocument()
    expect(screen.getByText('john.smith@email.com')).toBeInTheDocument()
    expect(screen.getByText('1250 Motor Mile Drive, Dallas, TX 75201')).toBeInTheDocument()
    expect(screen.getByText('C001')).toBeInTheDocument()
    expect(screen.getByText('Active')).toHaveClass('badge-posted')
    expect(screen.getByText('$1,200')).toHaveClass('stat-value--amber')
  })

  it('loads the customer\'s sales invoices and lists them', () => {
    const { actions, store } = renderLoaded(customer)
    expect(actions).toEqual([loadCustomerSalesInvoices('C001')])
    expect(screen.getByText('Loading sales invoices…')).toBeInTheDocument()

    answerInvoices(store, 'C001')
    const table = screen.getByRole('table', { name: 'Sales invoices for John Smith' })
    expect(cellsOf(table)).toEqual([
      ['INV-006244', '2026-11-13', 'Honda Civic', 'Angela Torres', '$19,890', '$2,168', '$17,722', 'Partial'],
      ['INV-006332', '2026-11-13', 'Honda Civic', 'Marcus Webb', '$19,870', '$19,870', '$0', 'Paid'],
      ['INV-006400', '—', '—', '—', '$21,000', '$0', '$21,000', '—'],
    ])
    expect(within(table).getByText('Partial')).toHaveClass('badge-partial')
    expect(within(table).getByText('Paid', { selector: '.badge' })).toHaveClass('badge-paid')
    expect(within(table).getByText('$17,722')).toHaveClass('text-amber')
    expect(within(table).getByText('$0', { selector: '.strong' })).toHaveClass('text-faint')
  })

  it('shows an unpaid invoice as pending', () => {
    const { store } = renderLoaded(customer)
    answerInvoices(store, 'C001', [{ ...customerSalesInvoices[0]!, paid: 0, balance: 19890, paymentStatus: 'unpaid' }])
    expect(screen.getByText('Unpaid')).toHaveClass('badge-pending')
  })

  it('shows the empty row when the customer has no invoices', () => {
    const { store } = renderLoaded(sparseCustomer)

    // Address and customer ID both fall back to '—'
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.getByText('Inactive')).toHaveClass('badge-cancelled')
    expect(screen.getAllByText('$0')[1]).toHaveClass('stat-value--green')

    answerInvoices(store, 'X', [])
    expect(within(screen.getByRole('table', { name: 'Sales invoices for Jane Doe' })).getByText('No invoices found')).toBeInTheDocument()
  })

  it('shows when the invoices failed to load and retries', async () => {
    const { actions, store, user } = renderLoaded(customer)
    act(() => { store.dispatch(loadCustomerSalesInvoicesFailure("This customer's sales invoices could not be loaded. Please try again.")) })

    expect(screen.getByText("Couldn't load sales invoices")).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Sales invoices for John Smith' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadCustomerSalesInvoices('C001').type)).toHaveLength(2)
  })

  it('keeps the listed invoices while they reload', () => {
    const { store } = renderLoaded(customer)
    answerInvoices(store, 'C001')
    act(() => { store.dispatch(loadCustomerSalesInvoices('C001')) })
    expect(screen.getByRole('table', { name: 'Sales invoices for John Smith' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('INV-006244')).toBeInTheDocument()
  })

  it('never shows another customer\'s invoices', () => {
    const { store } = renderLoaded(customer)
    answerInvoices(store, 'C002')
    expect(screen.getByText('Loading sales invoices…')).toBeInTheDocument()
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderLoaded(customer)
    await user.click(screen.getByRole('button', { name: '← Customers' }))
    // Clearing the selection also forgets the customer's invoices
    expect(actions).toEqual([loadCustomerSalesInvoices('C001'), clearCustomerSelection(), clearCustomerSalesInvoices()])
  })
})
