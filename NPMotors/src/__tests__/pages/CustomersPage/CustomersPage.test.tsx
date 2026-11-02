import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomersPage } from '../../../pages/CustomersPage/CustomersPage'
import {
  createCustomerSuccess,
  loadCustomers,
  loadCustomersFailure,
  loadCustomersSuccess,
  resetCustomerSave,
  selectCustomer,
  setCustomerPage,
  setCustomerSearch,
  setCustomerStatusFilter,
} from '../../../redux/customers/customers.actions'
import type { CustomersState } from '../../../redux/customers/customers.reducer'
import { customer, sparseCustomer } from '../../../test/fixtures/customers'
import { makeState, renderWithProviders } from '../../../test/test-utils'
import type { Customer } from '../../../types/customers'

// The page dispatches loadCustomers() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: Customer[], overrides: Partial<CustomersState> = {}, hasNext = false) {
  const result = renderWithProviders(<CustomersPage />, { preloadedState: makeState(overrides) })
  act(() => { result.store.dispatch(loadCustomersSuccess({ items, hasNext })) })
  return result
}

afterEach(() => {
  vi.useRealTimers()
})

describe('CustomersPage', () => {
  it('loads customers on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<CustomersPage />)
    expect(actions).toContainEqual(loadCustomers())
    expect(screen.getByText('Loading customers…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Customers' })).not.toBeInTheDocument()
  })

  it('renders a row per customer with the count, badges and fallbacks', () => {
    renderLoaded([customer, sparseCustomer])

    expect(screen.getByRole('heading', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByText('2 customers on this page')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Customers' })
    // header row + 2 customers
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('john.smith@email.com')).toBeInTheDocument()
    expect(within(table).getByText('Dallas, TX')).toBeInTheDocument()
    expect(within(table).getByText('$28,314')).toBeInTheDocument()
    expect(within(table).getByText('Active')).toHaveClass('badge-posted')
    expect(within(table).getByText('Inactive')).toHaveClass('badge-cancelled')
    expect(within(table).getByText('$1,200')).toHaveClass('text-amber')
    // sparseCustomer has no email, phone or city
    expect(within(table).getAllByText('—')).toHaveLength(3)
  })

  it('uses the singular for a single customer', () => {
    renderLoaded([customer])
    expect(screen.getByText('1 customer on this page')).toBeInTheDocument()
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No customers found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try clearing/)).not.toBeInTheDocument()
  })

  it('adds the clear-filters hint when a filter is active', () => {
    renderLoaded([], { query: { pageNumber: 1, pageSize: 5, status: 'active', searchTerm: '' } })
    expect(screen.getByText('No customers found. Try clearing the search or status filter.')).toBeInTheDocument()
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], { query: { pageNumber: 2, pageSize: 5, status: 'all', searchTerm: '' } })
    expect(screen.getByText('No more customers on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<CustomersPage />)
    act(() => { store.dispatch(loadCustomersFailure('The server is not responding.')) })

    expect(screen.getByText("Couldn't load customers")).toBeInTheDocument()
    expect(screen.getByText('The server is not responding.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Customers' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadCustomers().type)).toHaveLength(2)
  })

  it('dispatches the search term after the debounce delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { actions } = renderLoaded([customer])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.type(screen.getByRole('searchbox', { name: 'Search customers' }), '  smith ')
    expect(actions).not.toContainEqual(setCustomerSearch('smith'))

    act(() => { vi.advanceTimersByTime(300) })
    expect(actions).toContainEqual(setCustomerSearch('smith'))
  })

  it('dispatches the status filter when an option is chosen', async () => {
    const { actions, user } = renderLoaded([customer])
    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }))
    await user.click(screen.getByRole('option', { name: 'Inactive' }))
    expect(actions).toContainEqual(setCustomerStatusFilter('inactive'))
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([customer], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setCustomerPage(2))
  })

  it('opens a customer from its name, and disables the link when there is no id', async () => {
    const { actions, user } = renderLoaded([customer, sparseCustomer])
    expect(screen.getByRole('button', { name: 'Jane Doe' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'John Smith' }))
    expect(actions).toContainEqual(selectCustomer('C001'))
  })

  it('renders the detail view instead of the list when a customer is selected', () => {
    renderWithProviders(<CustomersPage />, { preloadedState: makeState({ selectedId: 'C001', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading customer…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Customers' })).not.toBeInTheDocument()
  })

  describe('Add Customer', () => {
    it('resets the save state and opens the dialog', async () => {
      const { actions, user } = renderLoaded([customer])
      await user.click(screen.getByRole('button', { name: 'Add Customer' }))

      expect(actions).toContainEqual(resetCustomerSave())
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('New Customer')).toBeInTheDocument()
    })

    it('closes the dialog on Cancel', async () => {
      const { user } = renderLoaded([customer])
      await user.click(screen.getByRole('button', { name: 'Add Customer' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('swaps the dialog for the success banner, which hides itself after 4 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { store } = renderLoaded([customer])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByRole('button', { name: 'Add Customer' }))

      act(() => { store.dispatch(createCustomerSuccess()) })
      expect(screen.getByText('Customer added successfully.')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByText('Customer added successfully.')).not.toBeInTheDocument()
      expect(store.getState().customers.saveStatus).toBe('idle')
    })

    it('dismisses the success banner', async () => {
      const { store, user } = renderLoaded([customer])
      await user.click(screen.getByRole('button', { name: 'Add Customer' }))
      act(() => { store.dispatch(createCustomerSuccess()) })

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText('Customer added successfully.')).not.toBeInTheDocument()
    })
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:customers' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([customer])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:customers')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv).toContain('"ID","First Name","Last Name"')
      expect(csv).toContain('"C001","John","Smith","john.smith@email.com"')
    })
  })
})
