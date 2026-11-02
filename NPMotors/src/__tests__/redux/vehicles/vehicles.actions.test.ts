import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/vehicles/vehicles.actions'
import { VEHICLE_ACTIONS } from '../../../redux/vehicles/vehicles.constants'
import { vehicle, vehicleFormValues, vehiclePage, vehicleSaveError, vehicleVendorOptions } from '../../../test/fixtures/vehicles'

describe('vehicles actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadVehicles', actions.loadVehicles, VEHICLE_ACTIONS.LOAD],
      ['clearVehicleSelection', actions.clearVehicleSelection, VEHICLE_ACTIONS.CLEAR_SELECTION],
      ['loadVehicleVendorOptions', actions.loadVehicleVendorOptions, VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS],
      ['createVehicleSuccess', actions.createVehicleSuccess, VEHICLE_ACTIONS.CREATE_SUCCESS],
      ['resetVehicleSave', actions.resetVehicleSave, VEHICLE_ACTIONS.RESET_SAVE],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadVehiclesSuccess carries the page', () => {
    expect(actions.loadVehiclesSuccess(vehiclePage)).toEqual({ type: VEHICLE_ACTIONS.LOAD_SUCCESS, payload: vehiclePage })
  })

  it('loadVehiclesFailure carries the message', () => {
    expect(actions.loadVehiclesFailure('Network error')).toEqual({ type: VEHICLE_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setVehicleSearch carries the search term', () => {
    expect(actions.setVehicleSearch('camry')).toEqual({ type: VEHICLE_ACTIONS.SET_SEARCH, payload: 'camry' })
  })

  it('setVehicleStatusFilter carries the status', () => {
    expect(actions.setVehicleStatusFilter('reserved')).toEqual({ type: VEHICLE_ACTIONS.SET_STATUS_FILTER, payload: 'reserved' })
  })

  it('setVehiclePage carries the page number', () => {
    expect(actions.setVehiclePage(3)).toEqual({ type: VEHICLE_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setVehiclePageSize carries the page size', () => {
    expect(actions.setVehiclePageSize(25)).toEqual({ type: VEHICLE_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('selectVehicle carries the id', () => {
    expect(actions.selectVehicle('2')).toEqual({ type: VEHICLE_ACTIONS.SELECT, payload: '2' })
  })

  it('loadVehicleByIdSuccess carries the vehicle', () => {
    expect(actions.loadVehicleByIdSuccess(vehicle)).toEqual({ type: VEHICLE_ACTIONS.LOAD_BY_ID_SUCCESS, payload: vehicle })
  })

  it('loadVehicleByIdFailure carries the message', () => {
    expect(actions.loadVehicleByIdFailure('Not found')).toEqual({ type: VEHICLE_ACTIONS.LOAD_BY_ID_FAILURE, payload: 'Not found' })
  })

  it('loadVehicleVendorOptionsSuccess carries the options', () => {
    expect(actions.loadVehicleVendorOptionsSuccess(vehicleVendorOptions))
      .toEqual({ type: VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS, payload: vehicleVendorOptions })
  })

  it('loadVehicleVendorOptionsFailure carries the message', () => {
    expect(actions.loadVehicleVendorOptionsFailure('No vendors'))
      .toEqual({ type: VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE, payload: 'No vendors' })
  })

  it('createVehicle carries the form values', () => {
    expect(actions.createVehicle(vehicleFormValues)).toEqual({ type: VEHICLE_ACTIONS.CREATE, payload: vehicleFormValues })
  })

  it('createVehicleFailure carries the save error', () => {
    expect(actions.createVehicleFailure(vehicleSaveError)).toEqual({ type: VEHICLE_ACTIONS.CREATE_FAILURE, payload: vehicleSaveError })
  })
})
