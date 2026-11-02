import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { Vehicle, VehicleFieldErrors, VehicleQuery, VehicleVendorOption } from '../../types/vehicles'
import type { VehiclesAction } from './vehicles.actions'
import { VEHICLE_ACTIONS } from './vehicles.constants'

export interface VehiclesState {
  items: Vehicle[]
  hasNext: boolean
  query: VehicleQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: Vehicle | null
  detailStatus: RequestStatus
  detailError: string | null
  vendorOptions: VehicleVendorOption[]
  vendorOptionsStatus: RequestStatus
  vendorOptionsError: string | null
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: VehicleFieldErrors
}

export const initialVehiclesState: VehiclesState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, status: 'all', searchTerm: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  vendorOptions: [],
  vendorOptionsStatus: 'idle',
  vendorOptionsError: null,
  saveStatus: 'idle',
  saveError: null,
  fieldErrors: {},
}

const vehicleActionTypes: ReadonlySet<string> = new Set(Object.values(VEHICLE_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isVehiclesAction = (action: UnknownAction): action is VehiclesAction => vehicleActionTypes.has(action.type)

export default function vehiclesReducer(state: VehiclesState = initialVehiclesState, action: UnknownAction): VehiclesState {
  if (!isVehiclesAction(action)) return state

  switch (action.type) {
    case VEHICLE_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case VEHICLE_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case VEHICLE_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case VEHICLE_ACTIONS.SET_SEARCH:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, searchTerm: action.payload, pageNumber: 1 } }
    case VEHICLE_ACTIONS.SET_STATUS_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, status: action.payload, pageNumber: 1 } }
    case VEHICLE_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case VEHICLE_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case VEHICLE_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case VEHICLE_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case VEHICLE_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case VEHICLE_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS:
      return { ...state, vendorOptionsStatus: 'loading', vendorOptionsError: null }
    case VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS:
      return { ...state, vendorOptions: action.payload, vendorOptionsStatus: 'success' }
    case VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE:
      return { ...state, vendorOptionsStatus: 'error', vendorOptionsError: action.payload }
    case VEHICLE_ACTIONS.CREATE:
      return { ...state, saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case VEHICLE_ACTIONS.CREATE_SUCCESS:
      return { ...state, saveStatus: 'success' }
    case VEHICLE_ACTIONS.CREATE_FAILURE:
      return { ...state, saveStatus: 'error', saveError: action.payload.message || null, fieldErrors: action.payload.fieldErrors }
    case VEHICLE_ACTIONS.RESET_SAVE:
      return { ...state, saveStatus: 'idle', saveError: null, fieldErrors: {} }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
