import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type {
  Vehicle,
  VehicleBankAccountOption,
  VehiclePurchaseFieldErrors,
  VehiclePurchaseResult,
  VehicleQuery,
  VehicleVendorOption,
} from '../../types/vehicles'
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
  bankAccountOptions: VehicleBankAccountOption[]
  bankAccountOptionsStatus: RequestStatus
  bankAccountOptionsError: string | null
  // Purchase Vehicle wizard
  purchaseStatus: RequestStatus
  purchaseError: string | null
  purchaseFieldErrors: VehiclePurchaseFieldErrors
  // Kept after the wizard closes, so Vehicle Inventory can confirm what was posted
  purchaseResult: VehiclePurchaseResult | null
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
  bankAccountOptions: [],
  bankAccountOptionsStatus: 'idle',
  bankAccountOptionsError: null,
  purchaseStatus: 'idle',
  purchaseError: null,
  purchaseFieldErrors: {},
  purchaseResult: null,
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
    case VEHICLE_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS:
      return { ...state, bankAccountOptionsStatus: 'loading', bankAccountOptionsError: null }
    case VEHICLE_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_SUCCESS:
      return { ...state, bankAccountOptions: action.payload, bankAccountOptionsStatus: 'success' }
    case VEHICLE_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_FAILURE:
      return { ...state, bankAccountOptionsStatus: 'error', bankAccountOptionsError: action.payload }
    case VEHICLE_ACTIONS.PURCHASE:
      return { ...state, purchaseStatus: 'loading', purchaseError: null, purchaseFieldErrors: {}, purchaseResult: null }
    case VEHICLE_ACTIONS.PURCHASE_SUCCESS:
      return { ...state, purchaseStatus: 'success', purchaseResult: action.payload }
    case VEHICLE_ACTIONS.PURCHASE_FAILURE:
      return { ...state, purchaseStatus: 'error', purchaseError: action.payload.message || null, purchaseFieldErrors: action.payload.fieldErrors }
    case VEHICLE_ACTIONS.RESET_PURCHASE:
      return { ...state, purchaseStatus: 'idle', purchaseError: null, purchaseFieldErrors: {}, purchaseResult: null }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
