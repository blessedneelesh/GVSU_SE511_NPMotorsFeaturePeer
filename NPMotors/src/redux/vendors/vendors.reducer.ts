import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { Vendor, VendorFieldErrors, VendorQuery } from '../../types/vendors'
import type { VendorsAction } from './vendors.actions'
import { VENDOR_ACTIONS } from './vendors.constants'

export interface VendorsState {
  items: Vendor[]
  hasNext: boolean
  query: VendorQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: Vendor | null
  detailStatus: RequestStatus
  detailError: string | null
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: VendorFieldErrors
}

export const initialVendorsState: VendorsState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, type: 'all', searchTerm: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  saveStatus: 'idle',
  saveError: null,
  fieldErrors: {},
}

const vendorActionTypes: ReadonlySet<string> = new Set(Object.values(VENDOR_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isVendorsAction = (action: UnknownAction): action is VendorsAction => vendorActionTypes.has(action.type)

export default function vendorsReducer(state: VendorsState = initialVendorsState, action: UnknownAction): VendorsState {
  if (!isVendorsAction(action)) return state

  switch (action.type) {
    case VENDOR_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case VENDOR_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case VENDOR_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case VENDOR_ACTIONS.SET_SEARCH:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, searchTerm: action.payload, pageNumber: 1 } }
    case VENDOR_ACTIONS.SET_TYPE_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, type: action.payload, pageNumber: 1 } }
    case VENDOR_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case VENDOR_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case VENDOR_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case VENDOR_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case VENDOR_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case VENDOR_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case VENDOR_ACTIONS.CREATE:
      return { ...state, saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case VENDOR_ACTIONS.CREATE_SUCCESS:
      return { ...state, saveStatus: 'success' }
    case VENDOR_ACTIONS.CREATE_FAILURE:
      return { ...state, saveStatus: 'error', saveError: action.payload.message || null, fieldErrors: action.payload.fieldErrors }
    case VENDOR_ACTIONS.RESET_SAVE:
      return { ...state, saveStatus: 'idle', saveError: null, fieldErrors: {} }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
