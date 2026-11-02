import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/vehicles/vehicles.actions'
import { loadCustomers } from '../../../redux/customers/customers.actions'
import { loadEmployees } from '../../../redux/employees/employees.actions'
import vehiclesReducer, { initialVehiclesState, type VehiclesState } from '../../../redux/vehicles/vehicles.reducer'
import { loadVendors } from '../../../redux/vendors/vendors.actions'
import { vehicle, vehicleFormValues, vehiclePage, vehicleSaveError, vehicleVendorOptions } from '../../../test/fixtures/vehicles'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: VehiclesState): VehiclesState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.vendorOptions)
  Object.freeze(state.fieldErrors)
  return Object.freeze(state)
}

const initial = () => frozen({ ...initialVehiclesState, query: { ...initialVehiclesState.query }, items: [], vendorOptions: [], fieldErrors: {} })

describe('vehiclesReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(vehiclesReducer(undefined, { type: '@@INIT' })).toEqual(initialVehiclesState)
  })

  it('starts on page 1 with 5 rows and no filters', () => {
    expect(initialVehiclesState.query).toEqual({ pageNumber: 1, pageSize: 5, status: 'all', searchTerm: '' })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(vehiclesReducer(state, { type: 'other/action' })).toBe(state)
  })

  it.each([
    ['customers', loadCustomers()],
    ['vendors', loadVendors()],
    ['employees', loadEmployees()],
  ])('ignores %s actions', (_, action) => {
    const state = initial()
    expect(vehiclesReducer(state, action)).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialVehiclesState, listError: 'old error' })
      expect(vehiclesReducer(state, actions.loadVehicles())).toEqual({ ...initialVehiclesState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(vehiclesReducer(initial(), actions.loadVehiclesSuccess(vehiclePage))).toEqual({
        ...initialVehiclesState,
        items: vehiclePage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(vehiclesReducer(initial(), actions.loadVehiclesFailure('Network error'))).toEqual({
        ...initialVehiclesState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialVehiclesState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialVehiclesState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it('SET_SEARCH sets the term and resets to page 1', () => {
      expect(vehiclesReducer(onPage3(), actions.setVehicleSearch('camry'))).toEqual({
        ...initialVehiclesState,
        ...reloading,
        query: { ...initialVehiclesState.query, searchTerm: 'camry', pageNumber: 1 },
      })
    })

    it('SET_STATUS_FILTER sets the status and resets to page 1', () => {
      expect(vehiclesReducer(onPage3(), actions.setVehicleStatusFilter('reserved'))).toEqual({
        ...initialVehiclesState,
        ...reloading,
        query: { ...initialVehiclesState.query, status: 'reserved', pageNumber: 1 },
      })
    })

    it('keeps the search term when the status changes', () => {
      const state = frozen({ ...initialVehiclesState, query: { ...initialVehiclesState.query, searchTerm: 'ford' } })
      expect(vehiclesReducer(state, actions.setVehicleStatusFilter('available')).query)
        .toEqual({ ...initialVehiclesState.query, searchTerm: 'ford', status: 'available' })
    })

    it('SET_PAGE_SIZE sets the size and resets to page 1', () => {
      expect(vehiclesReducer(onPage3(), actions.setVehiclePageSize(25))).toEqual({
        ...initialVehiclesState,
        ...reloading,
        query: { ...initialVehiclesState.query, pageSize: 25, pageNumber: 1 },
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(vehiclesReducer(onPage3(), actions.setVehiclePage(4))).toEqual({
        ...initialVehiclesState,
        ...reloading,
        query: { ...initialVehiclesState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(vehiclesReducer(onPage3(), actions.setVehiclePage(0)).query.pageNumber).toBe(1)
      expect(vehiclesReducer(onPage3(), actions.setVehiclePage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('detail', () => {
    it('SELECT stores the id, clears the previous vehicle and starts loading', () => {
      const state = frozen({ ...initialVehiclesState, selected: vehicle, detailStatus: 'error', detailError: 'old error' })
      expect(vehiclesReducer(state, actions.selectVehicle('24'))).toEqual({
        ...initialVehiclesState,
        selectedId: '24',
        selected: null,
        detailStatus: 'loading',
        detailError: null,
      })
    })

    it('LOAD_BY_ID_SUCCESS stores the vehicle', () => {
      const state = frozen({ ...initialVehiclesState, selectedId: '2', detailStatus: 'loading' })
      expect(vehiclesReducer(state, actions.loadVehicleByIdSuccess(vehicle))).toEqual({
        ...initialVehiclesState,
        selectedId: '2',
        selected: vehicle,
        detailStatus: 'success',
      })
    })

    it('LOAD_BY_ID_FAILURE stores the error', () => {
      const state = frozen({ ...initialVehiclesState, selectedId: '2', detailStatus: 'loading' })
      expect(vehiclesReducer(state, actions.loadVehicleByIdFailure('Not found'))).toEqual({
        ...initialVehiclesState,
        selectedId: '2',
        detailStatus: 'error',
        detailError: 'Not found',
      })
    })

    it('CLEAR_SELECTION resets every detail field', () => {
      const state = frozen({ ...initialVehiclesState, selectedId: '2', selected: vehicle, detailStatus: 'error', detailError: 'x' })
      expect(vehiclesReducer(state, actions.clearVehicleSelection())).toEqual(initialVehiclesState)
    })
  })

  describe('vendor options', () => {
    it('LOAD_VENDOR_OPTIONS starts loading, clears the error and keeps the current options', () => {
      const state = frozen({ ...initialVehiclesState, vendorOptions: vehicleVendorOptions, vendorOptionsStatus: 'error', vendorOptionsError: 'old' })
      expect(vehiclesReducer(state, actions.loadVehicleVendorOptions())).toEqual({
        ...initialVehiclesState,
        vendorOptions: vehicleVendorOptions,
        vendorOptionsStatus: 'loading',
        vendorOptionsError: null,
      })
    })

    it('LOAD_VENDOR_OPTIONS_SUCCESS stores the options', () => {
      expect(vehiclesReducer(initial(), actions.loadVehicleVendorOptionsSuccess(vehicleVendorOptions))).toEqual({
        ...initialVehiclesState,
        vendorOptions: vehicleVendorOptions,
        vendorOptionsStatus: 'success',
      })
    })

    it('LOAD_VENDOR_OPTIONS_FAILURE stores the error', () => {
      expect(vehiclesReducer(initial(), actions.loadVehicleVendorOptionsFailure('No vendors'))).toEqual({
        ...initialVehiclesState,
        vendorOptionsStatus: 'error',
        vendorOptionsError: 'No vendors',
      })
    })

    it('leaves the list untouched', () => {
      const state = frozen({ ...initialVehiclesState, items: vehiclePage.items, listStatus: 'success' })
      const result = vehiclesReducer(state, actions.loadVehicleVendorOptions())
      expect(result.items).toBe(state.items)
      expect(result.listStatus).toBe('success')
    })
  })

  describe('save', () => {
    it('CREATE starts saving and clears previous errors', () => {
      const state = frozen({ ...initialVehiclesState, saveStatus: 'error', saveError: 'old', fieldErrors: { vin: 'required' } })
      expect(vehiclesReducer(state, actions.createVehicle(vehicleFormValues))).toEqual({
        ...initialVehiclesState,
        saveStatus: 'loading',
        saveError: null,
        fieldErrors: {},
      })
    })

    it('CREATE_SUCCESS marks the save as successful', () => {
      const state = frozen({ ...initialVehiclesState, saveStatus: 'loading' })
      expect(vehiclesReducer(state, actions.createVehicleSuccess())).toEqual({ ...initialVehiclesState, saveStatus: 'success' })
    })

    it('CREATE_FAILURE stores the message and field errors', () => {
      expect(vehiclesReducer(initial(), actions.createVehicleFailure(vehicleSaveError))).toEqual({
        ...initialVehiclesState,
        saveStatus: 'error',
        saveError: vehicleSaveError.message,
        fieldErrors: vehicleSaveError.fieldErrors,
      })
    })

    it('CREATE_FAILURE stores null when the message is empty', () => {
      const result = vehiclesReducer(initial(), actions.createVehicleFailure({ message: '', fieldErrors: { purchasePrice: 'Too low' } }))
      expect(result.saveError).toBeNull()
      expect(result.fieldErrors).toEqual({ purchasePrice: 'Too low' })
    })

    it('RESET_SAVE returns the save fields to idle', () => {
      const state = frozen({ ...initialVehiclesState, saveStatus: 'error', saveError: 'x', fieldErrors: { vin: 'bad' } })
      expect(vehiclesReducer(state, actions.resetVehicleSave())).toEqual(initialVehiclesState)
    })
  })
})
