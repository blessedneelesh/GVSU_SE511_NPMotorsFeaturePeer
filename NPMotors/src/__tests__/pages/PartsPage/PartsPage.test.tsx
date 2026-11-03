import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PartsPage } from '../../../pages/PartsPage/PartsPage'
import {
  loadPartReceiveOptions,
  loadParts,
  loadPartsFailure,
  loadPartsSuccess,
  loadPartVendorOptions,
  loadPartVendorOptionsSuccess,
  receivePartsSuccess,
  resetPartSave,
  selectPart,
  setPartCategoryFilter,
  setPartPage,
  setPartSearch,
  setPartStockFilter,
} from '../../../redux/parts/parts.actions'
import type { PartsState } from '../../../redux/parts/parts.reducer'
import { lowStockPart, part, partReceiveLines, partVendorOptions, sparsePart } from '../../../test/fixtures/parts'
import { makePartState, renderWithProviders } from '../../../test/test-utils'
import type { Part } from '../../../types/parts'

// The page dispatches loadParts() and loadPartVendorOptions() on mount. Without a saga nothing answers them,
// so each test dispatches the responses itself, just as the saga would.
function renderLoaded(items: Part[], overrides: Partial<PartsState> = {}, hasNext = false) {
  const result = renderWithProviders(<PartsPage />, { preloadedState: makePartState(overrides) })
  act(() => {
    result.store.dispatch(loadPartsSuccess({ items, hasNext }))
    result.store.dispatch(loadPartVendorOptionsSuccess(partVendorOptions))
  })
  return result
}

const noFilters = { pageNumber: 1, pageSize: 5, category: 'all', stock: 'all', searchTerm: '' } as const

afterEach(() => {
  vi.useRealTimers()
})

describe('PartsPage', () => {
  it('loads the parts and vendors on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<PartsPage />)
    expect(actions).toContainEqual(loadParts())
    expect(actions).toContainEqual(loadPartVendorOptions())
    expect(screen.getByText('Loading parts…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Parts' })).not.toBeInTheDocument()
  })

  it('renders a row per part with the count, prices, vendor, badges and fallbacks', () => {
    renderLoaded([part, lowStockPart, sparsePart])

    expect(screen.getByRole('heading', { name: 'Parts & Service Inventory' })).toBeInTheDocument()
    expect(screen.getByText('3 parts on this page')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Parts' })
    // header row + 3 parts
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent))
      .toEqual(['Part Number', 'Description', 'Category', 'Vendor', 'Cost', 'Sell Price', 'Qty', 'Status', 'Actions'])

    expect(within(table).getByText('BRK-1001')).toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'Front Brake Pad Set' })).toBeEnabled()
    expect(within(table).getByText('Brakes')).toHaveClass('part-category')
    expect(within(table).getByText('Great Lakes Auto Parts')).toBeInTheDocument()
    expect(within(table).getByText('$38.50')).toBeInTheDocument()
    expect(within(table).getByText('$69.99')).toHaveClass('text-green-dark')
    expect(within(table).getByText('40')).toHaveClass('text-dark')
    // part and sparsePart are both in stock
    for (const badge of within(table).getAllByText('In Stock')) expect(badge).toHaveClass('badge-posted')

    // A part at or below its reorder level gets a red quantity and the Low Stock badge
    expect(within(table).getByText('Lakeshore Tire & Wheel')).toBeInTheDocument()
    expect(within(table).getByText('3')).toHaveClass('text-red')
    expect(within(table).getByText('Low Stock')).toHaveClass('badge-overdue')

    // sparsePart has no part number, category or vendor
    expect(within(table).getAllByText('—')).toHaveLength(3)
  })

  it('shows the vendor id until the vendors load', () => {
    const { store } = renderWithProviders(<PartsPage />)
    act(() => { store.dispatch(loadPartsSuccess({ items: [part], hasNext: false })) })
    expect(within(screen.getByRole('table', { name: 'Parts' })).getByText('Vendor #2')).toBeInTheDocument()
  })

  it('leaves out the Reorder At and Stock Value columns', () => {
    renderLoaded([part])
    const table = screen.getByRole('table', { name: 'Parts' })
    expect(within(table).queryByRole('columnheader', { name: 'Reorder At' })).not.toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: 'Stock Value' })).not.toBeInTheDocument()
    expect(within(table).queryByText('$1,540')).not.toBeInTheDocument()
  })

  it('uses the singular for a single part', () => {
    renderLoaded([part])
    expect(screen.getByText('1 part on this page')).toBeInTheDocument()
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No parts found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try clearing/)).not.toBeInTheDocument()
  })

  it.each([
    ['category', { category: 'Brakes' }],
    ['stock', { stock: 'low' }],
    ['search', { searchTerm: 'pad' }],
  ] as const)('adds the clear-filters hint when the %s filter is active', (_, filter) => {
    renderLoaded([], { query: { ...noFilters, ...filter } })
    expect(screen.getByText('No parts found. Try clearing the search or filters.')).toBeInTheDocument()
  })

  it('shows the active filters in their dropdowns', () => {
    renderLoaded([], { query: { ...noFilters, category: 'Brakes', stock: 'low' } })
    expect(screen.getByRole('combobox', { name: 'Filter parts by category' })).toHaveTextContent('Brakes')
    expect(screen.getByRole('combobox', { name: 'Filter parts by stock level' })).toHaveTextContent('Low Stock Only')
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], { query: { ...noFilters, pageNumber: 2 } })
    expect(screen.getByText('No more parts on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<PartsPage />)
    act(() => { store.dispatch(loadPartsFailure('Parts service is unreachable.')) })

    expect(screen.getByText("Couldn't load parts")).toBeInTheDocument()
    expect(screen.getByText('Parts service is unreachable.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Parts' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadParts().type)).toHaveLength(2)
  })

  it('dispatches the search term after the debounce delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { actions } = renderLoaded([part])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.type(screen.getByRole('searchbox', { name: 'Search parts' }), '  pad ')
    expect(actions).not.toContainEqual(setPartSearch('pad'))

    act(() => { vi.advanceTimersByTime(300) })
    expect(actions).toContainEqual(setPartSearch('pad'))
  })

  it('offers every category and dispatches the chosen one', async () => {
    const { actions, user } = renderLoaded([part])
    await user.click(screen.getByRole('combobox', { name: 'Filter parts by category' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent))
      .toEqual(['All Categories', 'Accessories', 'Brakes', 'Electrical', 'Engine', 'Filters', 'Tires', 'Wheels'])
    await user.click(screen.getByRole('option', { name: 'Filters' }))
    expect(actions).toContainEqual(setPartCategoryFilter('Filters'))
  })

  it('dispatches the low-stock filter', async () => {
    const { actions, user } = renderLoaded([part])
    await user.click(screen.getByRole('combobox', { name: 'Filter parts by stock level' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['All Stock', 'Low Stock Only'])
    await user.click(screen.getByRole('option', { name: 'Low Stock Only' }))
    expect(actions).toContainEqual(setPartStockFilter('low'))
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([part], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setPartPage(2))
  })

  it('disables the name and View links when a part has no id', () => {
    renderLoaded([part, sparsePart])
    expect(screen.getByRole('button', { name: 'Unnamed part' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'View' })).toBeDisabled()
  })

  it.each([
    ['its name', 'Front Brake Pad Set'],
    ['its View link', 'View Front Brake Pad Set'],
  ])('opens a part from %s', async (_, name) => {
    const { actions, user } = renderLoaded([part, sparsePart])
    await user.click(screen.getByRole('button', { name }))
    expect(actions).toContainEqual(selectPart('1'))
    expect(screen.getByText('Loading part…')).toBeInTheDocument()
  })

  it('renders the detail view instead of the list when a part is selected', () => {
    renderWithProviders(<PartsPage />, { preloadedState: makePartState({ selectedId: '1', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading part…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Parts & Service Inventory' })).not.toBeInTheDocument()
  })

  describe('Receive Parts', () => {
    it('resets the receipt state, opens the dialog and loads the parts and bank accounts', async () => {
      const { actions, user } = renderLoaded([part])
      await user.click(screen.getByRole('button', { name: 'Receive Parts' }))

      expect(actions).toContainEqual(resetPartSave())
      expect(actions).toContainEqual(loadPartReceiveOptions())
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Record incoming stock from a vendor')).toBeInTheDocument()
    })

    it('closes the dialog on Cancel without a banner', async () => {
      const { user } = renderLoaded([part])
      await user.click(screen.getByRole('button', { name: 'Receive Parts' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.queryByText(/Parts receipt posted/)).not.toBeInTheDocument()
    })

    it('shows the banner and highlights the received rows after Done, then clears both after 5 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { store } = renderLoaded([part, lowStockPart])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByRole('button', { name: 'Receive Parts' }))

      act(() => { store.dispatch(receivePartsSuccess(partReceiveLines)) })
      expect(screen.getByRole('heading', { name: 'Parts Received' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Done' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getByText('Parts receipt posted — inventory quantities updated.')).toBeInTheDocument()
      expect(store.getState().parts.saveStatus).toBe('idle')
      const table = screen.getByRole('table', { name: 'Parts' })
      // Only part 1 of the received lines is on this page
      expect(within(table).getAllByText('↑ Just received')).toHaveLength(1)
      expect(within(table).getByRole('button', { name: 'Front Brake Pad Set' }).closest('tr')).toHaveClass('is-just-received')

      act(() => { vi.advanceTimersByTime(5000) })
      expect(screen.queryByText('Parts receipt posted — inventory quantities updated.')).not.toBeInTheDocument()
      expect(screen.queryByText('↑ Just received')).not.toBeInTheDocument()
    })

    it('dismisses the receipt banner', async () => {
      const { store, user } = renderLoaded([part])
      await user.click(screen.getByRole('button', { name: 'Receive Parts' }))
      act(() => { store.dispatch(receivePartsSuccess(partReceiveLines)) })
      await user.click(screen.getByRole('button', { name: 'Done' }))

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText(/Parts receipt posted/)).not.toBeInTheDocument()
      expect(screen.queryByText('↑ Just received')).not.toBeInTheDocument()
    })
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV with the vendor names', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:parts' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([part, sparsePart])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:parts')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv?.split('\n')).toEqual([
        '"ID","Part Number","Description","Category","Vendor","Cost","Sell Price","Qty","Reorder At","Warehouse","Stock Value","Status"',
        '"1","BRK-1001","Front Brake Pad Set","Brakes","Great Lakes Auto Parts","38.5","69.99","40","10","Warehouse A","1540","In Stock"',
        '"","","","","","0","0","0","0","","0","In Stock"',
      ])
    })
  })
})
