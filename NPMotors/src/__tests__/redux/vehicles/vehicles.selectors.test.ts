import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/vehicles/vehicles.selectors'
import { makeVehicleState } from '../../../test/test-utils'
import { vehicle, vehiclePage, vehicleVendorOptions } from '../../../test/fixtures/vehicles'

const query = { pageNumber: 2, pageSize: 10, status: 'reserved', searchTerm: 'camry' } as const

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeVehicleState({
  items: vehiclePage.items,
  hasNext: true,
  query,
  listStatus: 'success',
  listError: 'list error',
  selectedId: '2',
  selected: vehicle,
  detailStatus: 'error',
  detailError: 'detail error',
  vendorOptions: vehicleVendorOptions,
  vendorOptionsStatus: 'success',
  vendorOptionsError: 'vendor error',
  saveStatus: 'loading',
  saveError: 'save error',
  fieldErrors: { vin: 'The Vin field is required.' },
})

describe('vehicles selectors', () => {
  it('selectVehicleState returns the slice', () => {
    expect(selectors.selectVehicleState(state)).toBe(state.vehicles)
  })

  it.each([
    ['selectVehicles', selectors.selectVehicles, vehiclePage.items],
    ['selectVehicleHasNext', selectors.selectVehicleHasNext, true],
    ['selectVehicleQuery', selectors.selectVehicleQuery, query],
    ['selectVehicleListStatus', selectors.selectVehicleListStatus, 'success'],
    ['selectVehicleListError', selectors.selectVehicleListError, 'list error'],
    ['selectSelectedVehicleId', selectors.selectSelectedVehicleId, '2'],
    ['selectSelectedVehicle', selectors.selectSelectedVehicle, vehicle],
    ['selectVehicleDetailStatus', selectors.selectVehicleDetailStatus, 'error'],
    ['selectVehicleDetailError', selectors.selectVehicleDetailError, 'detail error'],
    ['selectVehicleVendorOptions', selectors.selectVehicleVendorOptions, vehicleVendorOptions],
    ['selectVehicleVendorOptionsStatus', selectors.selectVehicleVendorOptionsStatus, 'success'],
    ['selectVehicleVendorOptionsError', selectors.selectVehicleVendorOptionsError, 'vendor error'],
    ['selectVehicleSaveStatus', selectors.selectVehicleSaveStatus, 'loading'],
    ['selectVehicleSaveError', selectors.selectVehicleSaveError, 'save error'],
    ['selectVehicleFieldErrors', selectors.selectVehicleFieldErrors, { vin: 'The Vin field is required.' }],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectVehicles(state)).toBe(selectors.selectVehicles(state))
      expect(selectors.selectVehicleQuery(state)).toBe(selectors.selectVehicleQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectVehicles(state)
      const next = { ...state, vehicles: { ...state.vehicles, listStatus: 'loading' as const } }
      expect(selectors.selectVehicles(next)).toBe(before)
    })

    it('keeps the items reference when only another slice changes', () => {
      const before = selectors.selectVehicles(state)
      const next = { ...state, employees: { ...state.employees, listStatus: 'loading' as const } }
      expect(selectors.selectVehicles(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, vehicles: { ...state.vehicles, items: [vehicle] } }
      expect(selectors.selectVehicles(next)).toEqual([vehicle])
    })
  })
})
