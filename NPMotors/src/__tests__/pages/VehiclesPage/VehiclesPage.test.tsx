import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VehiclesPage } from '../../../pages/VehiclesPage/VehiclesPage'
import {
  createVehicleSuccess,
  loadVehicles,
  loadVehiclesFailure,
  loadVehiclesSuccess,
  loadVehicleVendorOptions,
  resetVehicleSave,
  selectVehicle,
  setVehiclePage,
  setVehicleSearch,
  setVehicleStatusFilter,
} from '../../../redux/vehicles/vehicles.actions'
import type { VehiclesState } from '../../../redux/vehicles/vehicles.reducer'
import { sparseVehicle, vehicle } from '../../../test/fixtures/vehicles'
import { makeVehicleState, renderWithProviders } from '../../../test/test-utils'
import type { Vehicle } from '../../../types/vehicles'

// The page dispatches loadVehicles() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: Vehicle[], overrides: Partial<VehiclesState> = {}, hasNext = false) {
  const result = renderWithProviders(<VehiclesPage />, { preloadedState: makeVehicleState(overrides) })
  act(() => { result.store.dispatch(loadVehiclesSuccess({ items, hasNext })) })
  return result
}

const noFilters = { pageNumber: 1, pageSize: 5, status: 'all', searchTerm: '' } as const

afterEach(() => {
  vi.useRealTimers()
})

describe('VehiclesPage', () => {
  it('loads vehicles on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<VehiclesPage />)
    expect(actions).toContainEqual(loadVehicles())
    expect(screen.getByText('Loading vehicles…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Vehicles' })).not.toBeInTheDocument()
  })

  it('renders a row per vehicle with the count, money, badges and fallbacks', () => {
    renderLoaded([vehicle, sparseVehicle])

    expect(screen.getByRole('heading', { name: 'Vehicle Inventory' })).toBeInTheDocument()
    expect(screen.getByText('2 vehicles on this page')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Vehicles' })
    // header row + 2 vehicles
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent))
      .toEqual(['VIN', 'Vehicle', 'Color', 'Warehouse', 'Cost', 'List Price', 'Profit', 'Status', 'Actions'])

    // The list shows the last 8 VIN characters, with the full VIN as a tooltip
    expect(within(table).getByText('NZ123456')).toHaveAttribute('title', '1GCUYDED5NZ123456')
    expect(within(table).getByText('2026-03-14')).toBeInTheDocument()
    expect(within(table).getByText('Black')).toBeInTheDocument()
    expect(within(table).getByText('Main Lot')).toBeInTheDocument()
    expect(within(table).getByText('$39,500')).toBeInTheDocument()
    expect(within(table).getByText('$44,500')).toBeInTheDocument()
    expect(within(table).getByText('$5,000')).toHaveClass('text-green')
    expect(within(table).getByText('Sold')).toHaveClass('badge-cancelled')

    expect(within(table).getByText('$1,200')).toBeInTheDocument()
    expect(within(table).getByText('-$1,200')).toHaveClass('text-red')
    expect(within(table).getByText('Reserved')).toHaveClass('badge-pending')
    // sparseVehicle has no VIN, purchase date, colour or warehouse
    expect(within(table).getAllByText('—')).toHaveLength(4)
  })

  it('uses the singular for a single vehicle', () => {
    renderLoaded([vehicle])
    expect(screen.getByText('1 vehicle on this page')).toBeInTheDocument()
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No vehicles found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try clearing/)).not.toBeInTheDocument()
  })

  it.each([
    ['status', { status: 'reserved' }, 'Reserved'],
    ['search', { searchTerm: 'camry' }, 'All Status'],
  ] as const)('adds the clear-filters hint when the %s filter is active', (_, filter, label) => {
    renderLoaded([], { query: { ...noFilters, ...filter } })
    expect(screen.getByText('No vehicles found. Try clearing the search or status filter.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter vehicles by status' })).toHaveTextContent(label)
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], { query: { ...noFilters, pageNumber: 2 } })
    expect(screen.getByText('No more vehicles on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<VehiclesPage />)
    act(() => { store.dispatch(loadVehiclesFailure("Status must be 'available' or 'reserved'.")) })

    expect(screen.getByText("Couldn't load vehicles")).toBeInTheDocument()
    expect(screen.getByText("Status must be 'available' or 'reserved'.")).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Vehicles' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadVehicles().type)).toHaveLength(2)
  })

  it('dispatches the search term after the debounce delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { actions } = renderLoaded([vehicle])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.type(screen.getByRole('searchbox', { name: 'Search vehicles' }), '  camry ')
    expect(actions).not.toContainEqual(setVehicleSearch('camry'))

    act(() => { vi.advanceTimersByTime(300) })
    expect(actions).toContainEqual(setVehicleSearch('camry'))
  })

  // GetAllVehicles rejects Status=sold, so only the statuses it filters by are offered
  it('offers the filterable statuses and dispatches the chosen one', async () => {
    const { actions, user } = renderLoaded([vehicle])
    await user.click(screen.getByRole('combobox', { name: 'Filter vehicles by status' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['All Status', 'Available', 'Reserved'])
    await user.click(screen.getByRole('option', { name: 'Reserved' }))
    expect(actions).toContainEqual(setVehicleStatusFilter('reserved'))
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([vehicle], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setVehiclePage(2))
  })

  it('disables the title and View links when a vehicle has no id', () => {
    renderLoaded([vehicle, sparseVehicle])
    expect(screen.getByRole('button', { name: 'Unnamed vehicle' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'View Unnamed vehicle' })).toBeDisabled()
  })

  it.each([
    ['its title', '2022 Chevrolet Silverado 1500'],
    ['its View link', 'View 2022 Chevrolet Silverado 1500'],
  ])('opens a vehicle from %s', async (_, name) => {
    const { actions, user } = renderLoaded([vehicle, sparseVehicle])
    await user.click(screen.getByRole('button', { name }))
    expect(actions).toContainEqual(selectVehicle('2'))
    expect(screen.getByText('Loading vehicle…')).toBeInTheDocument()
  })

  it('renders the detail view instead of the list when a vehicle is selected', () => {
    renderWithProviders(<VehiclesPage />, { preloadedState: makeVehicleState({ selectedId: '2', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading vehicle…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Vehicle Inventory' })).not.toBeInTheDocument()
  })

  describe('Add Vehicle', () => {
    it('resets the save state, opens the dialog and loads the vendors', async () => {
      const { actions, user } = renderLoaded([vehicle])
      await user.click(screen.getByRole('button', { name: 'Add Vehicle' }))

      expect(actions).toContainEqual(resetVehicleSave())
      expect(actions).toContainEqual(loadVehicleVendorOptions())
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add a purchased vehicle to inventory')).toBeInTheDocument()
    })

    it('closes the dialog on Cancel', async () => {
      const { user } = renderLoaded([vehicle])
      await user.click(screen.getByRole('button', { name: 'Add Vehicle' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('swaps the dialog for the success banner, which hides itself after 4 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { store } = renderLoaded([vehicle])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByRole('button', { name: 'Add Vehicle' }))

      act(() => { store.dispatch(createVehicleSuccess()) })
      expect(screen.getByText('Vehicle added to inventory.')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByText('Vehicle added to inventory.')).not.toBeInTheDocument()
      expect(store.getState().vehicles.saveStatus).toBe('idle')
    })

    it('dismisses the success banner', async () => {
      const { store, user } = renderLoaded([vehicle])
      await user.click(screen.getByRole('button', { name: 'Add Vehicle' }))
      act(() => { store.dispatch(createVehicleSuccess()) })

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText('Vehicle added to inventory.')).not.toBeInTheDocument()
    })
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:vehicles' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([vehicle, sparseVehicle])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:vehicles')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv?.split('\n')).toEqual([
        '"ID","VIN","Year","Make","Model","Color","Warehouse","Purchase Date","Vendor","Purchase Price","Additional Costs","Total Cost","List Price","Gross Profit","Status"',
        '"2","1GCUYDED5NZ123456","2022","Chevrolet","Silverado 1500","Black","Main Lot","2026-03-14","AutoNation","38000","1500","39500","44500","5000","Sold"',
        '"","","","","","","","","","1000","200","1200","0","-1200","Reserved"',
      ])
    })
  })
})
