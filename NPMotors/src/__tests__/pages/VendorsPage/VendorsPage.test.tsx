import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VendorsPage } from '../../../pages/VendorsPage/VendorsPage'
import {
  createVendorSuccess,
  loadVendors,
  loadVendorsFailure,
  loadVendorsSuccess,
  resetVendorSave,
  selectVendor,
  setVendorPage,
  setVendorSearch,
  setVendorTypeFilter,
} from '../../../redux/vendors/vendors.actions'
import type { VendorsState } from '../../../redux/vendors/vendors.reducer'
import { sparseVendor, vendor } from '../../../test/fixtures/vendors'
import { makeVendorState, renderWithProviders } from '../../../test/test-utils'
import type { Vendor } from '../../../types/vendors'

// The page dispatches loadVendors() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: Vendor[], overrides: Partial<VendorsState> = {}, hasNext = false) {
  const result = renderWithProviders(<VendorsPage />, { preloadedState: makeVendorState(overrides) })
  act(() => { result.store.dispatch(loadVendorsSuccess({ items, hasNext })) })
  return result
}

afterEach(() => {
  vi.useRealTimers()
})

describe('VendorsPage', () => {
  it('loads vendors on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<VendorsPage />)
    expect(actions).toContainEqual(loadVendors())
    expect(screen.getByText('Loading vendors…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Vendors' })).not.toBeInTheDocument()
  })

  it('renders a row per vendor with the count, type chips, badges and fallbacks', () => {
    renderLoaded([vendor, sparseVendor])

    expect(screen.getByRole('heading', { name: 'Vendors' })).toBeInTheDocument()
    expect(screen.getByText('2 vendors on this page')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Vendors' })
    // header row + 2 vendors
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('trade@detroitdealerx.example')).toBeInTheDocument()
    expect(within(table).getByText('Omar Haddad')).toBeInTheDocument()
    expect(within(table).getByText('313-555-0205')).toBeInTheDocument()
    expect(within(table).getByText('Vehicle')).toHaveClass('type-chip')
    expect(within(table).getByText('Parts')).toHaveClass('type-chip')
    expect(within(table).getByText('$28,000')).toBeInTheDocument()
    expect(within(table).getByText('$3,500')).toHaveClass('text-red')
    expect(within(table).getByText('Active')).toHaveClass('badge-posted')
    expect(within(table).getByText('Inactive')).toHaveClass('badge-cancelled')
    // sparseVendor has no email, contact or phone, and no outstanding balance
    expect(within(table).getAllByText('—')).toHaveLength(4)
  })

  it('uses the singular for a single vendor', () => {
    renderLoaded([vendor])
    expect(screen.getByText('1 vendor on this page')).toBeInTheDocument()
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No vendors found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try clearing/)).not.toBeInTheDocument()
  })

  it('adds the clear-filters hint when a filter is active', () => {
    renderLoaded([], { query: { pageNumber: 1, pageSize: 5, type: 'parts', searchTerm: '' } })
    expect(screen.getByText('No vendors found. Try clearing the search or type filter.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by type' })).toHaveTextContent('Parts')
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], { query: { pageNumber: 2, pageSize: 5, type: 'all', searchTerm: '' } })
    expect(screen.getByText('No more vendors on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<VendorsPage />)
    act(() => { store.dispatch(loadVendorsFailure('The server is not responding.')) })

    expect(screen.getByText("Couldn't load vendors")).toBeInTheDocument()
    expect(screen.getByText('The server is not responding.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Vendors' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadVendors().type)).toHaveLength(2)
  })

  it('dispatches the search term after the debounce delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { actions } = renderLoaded([vendor])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.type(screen.getByRole('searchbox', { name: 'Search vendors' }), '  detroit ')
    expect(actions).not.toContainEqual(setVendorSearch('detroit'))

    act(() => { vi.advanceTimersByTime(300) })
    expect(actions).toContainEqual(setVendorSearch('detroit'))
  })

  it('offers the three API vendor types and dispatches the chosen one', async () => {
    const { actions, user } = renderLoaded([vendor])
    await user.click(screen.getByRole('combobox', { name: 'Filter by type' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['All Types', 'Vehicle', 'Parts', 'Service'])
    await user.click(screen.getByRole('option', { name: 'Service' }))
    expect(actions).toContainEqual(setVendorTypeFilter('service'))
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([vendor], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setVendorPage(2))
  })

  it('disables the name and View links when a vendor has no id', () => {
    renderLoaded([vendor, sparseVendor])
    expect(screen.getByRole('button', { name: 'Jane Supply' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'View Jane Supply' })).toBeDisabled()
  })

  // Opening a vendor swaps the list for the detail view, so each entry point gets its own render
  it.each([
    ['its name', 'Detroit Dealer Exchange'],
    ['View', 'View Detroit Dealer Exchange'],
  ])('opens a vendor from %s', async (_, name) => {
    const { actions, user } = renderLoaded([vendor, sparseVendor])
    await user.click(screen.getByRole('button', { name }))
    expect(actions).toContainEqual(selectVendor('5'))
    expect(screen.getByText('Loading vendor…')).toBeInTheDocument()
  })

  it('renders the detail view instead of the list when a vendor is selected', () => {
    renderWithProviders(<VendorsPage />, { preloadedState: makeVendorState({ selectedId: '5', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading vendor…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Vendors' })).not.toBeInTheDocument()
  })

  describe('Add Vendor', () => {
    it('resets the save state and opens the dialog', async () => {
      const { actions, user } = renderLoaded([vendor])
      await user.click(screen.getByRole('button', { name: 'Add Vendor' }))

      expect(actions).toContainEqual(resetVendorSave())
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('New Vendor')).toBeInTheDocument()
    })

    it('closes the dialog on Cancel', async () => {
      const { user } = renderLoaded([vendor])
      await user.click(screen.getByRole('button', { name: 'Add Vendor' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('swaps the dialog for the success banner, which hides itself after 4 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { store } = renderLoaded([vendor])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByRole('button', { name: 'Add Vendor' }))

      act(() => { store.dispatch(createVendorSuccess()) })
      expect(screen.getByText('Vendor added successfully.')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByText('Vendor added successfully.')).not.toBeInTheDocument()
      expect(store.getState().vendors.saveStatus).toBe('idle')
    })

    it('dismisses the success banner', async () => {
      const { store, user } = renderLoaded([vendor])
      await user.click(screen.getByRole('button', { name: 'Add Vendor' }))
      act(() => { store.dispatch(createVendorSuccess()) })

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText('Vendor added successfully.')).not.toBeInTheDocument()
    })
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV with readable type labels', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:vendors' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([vendor])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:vendors')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv).toContain('"ID","Name","Contact","Phone","Email","Address","Type","Status","Total Purchases","Outstanding"')
      expect(csv).toContain('"5","Detroit Dealer Exchange","Omar Haddad","313-555-0205"')
      expect(csv).toContain('"Vehicle","Active","28000","3500"')
    })
  })
})
