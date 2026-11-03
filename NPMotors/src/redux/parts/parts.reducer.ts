import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { Part, PartQuery, PartReceiveLine, PartReceiveOptions, PartVendorOption } from '../../types/parts'
import type { PartsAction } from './parts.actions'
import { PART_ACTIONS } from './parts.constants'

export interface PartsState {
  items: Part[]
  hasNext: boolean
  query: PartQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: Part | null
  detailStatus: RequestStatus
  detailError: string | null
  vendorOptions: PartVendorOption[]
  vendorOptionsStatus: RequestStatus
  vendorOptionsError: string | null
  receiveOptions: PartReceiveOptions
  receiveOptionsStatus: RequestStatus
  receiveOptionsError: string | null
  saveStatus: RequestStatus
  saveError: string | null
  // Lines saved by UpdatePart since the form opened, including those saved before a failed line
  receivedLines: PartReceiveLine[]
}

export const initialPartsState: PartsState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, category: 'all', stock: 'all', searchTerm: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  vendorOptions: [],
  vendorOptionsStatus: 'idle',
  vendorOptionsError: null,
  receiveOptions: { parts: [], bankAccounts: [] },
  receiveOptionsStatus: 'idle',
  receiveOptionsError: null,
  saveStatus: 'idle',
  saveError: null,
  receivedLines: [],
}

const partActionTypes: ReadonlySet<string> = new Set(Object.values(PART_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isPartsAction = (action: UnknownAction): action is PartsAction => partActionTypes.has(action.type)

export default function partsReducer(state: PartsState = initialPartsState, action: UnknownAction): PartsState {
  if (!isPartsAction(action)) return state

  switch (action.type) {
    case PART_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case PART_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case PART_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case PART_ACTIONS.SET_SEARCH:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, searchTerm: action.payload, pageNumber: 1 } }
    case PART_ACTIONS.SET_CATEGORY_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, category: action.payload, pageNumber: 1 } }
    case PART_ACTIONS.SET_STOCK_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, stock: action.payload, pageNumber: 1 } }
    case PART_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case PART_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case PART_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case PART_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case PART_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case PART_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case PART_ACTIONS.LOAD_VENDOR_OPTIONS:
      return { ...state, vendorOptionsStatus: 'loading', vendorOptionsError: null }
    case PART_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS:
      return { ...state, vendorOptions: action.payload, vendorOptionsStatus: 'success' }
    case PART_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE:
      return { ...state, vendorOptionsStatus: 'error', vendorOptionsError: action.payload }
    case PART_ACTIONS.LOAD_RECEIVE_OPTIONS:
      return { ...state, receiveOptionsStatus: 'loading', receiveOptionsError: null }
    case PART_ACTIONS.LOAD_RECEIVE_OPTIONS_SUCCESS:
      return { ...state, receiveOptions: action.payload, receiveOptionsStatus: 'success' }
    case PART_ACTIONS.LOAD_RECEIVE_OPTIONS_FAILURE:
      return { ...state, receiveOptionsStatus: 'error', receiveOptionsError: action.payload }
    // receivedLines accumulate across a retry, so lines already saved are never sent twice
    case PART_ACTIONS.RECEIVE:
      return { ...state, saveStatus: 'loading', saveError: null }
    case PART_ACTIONS.RECEIVE_SUCCESS:
      return { ...state, saveStatus: 'success', receivedLines: [...state.receivedLines, ...action.payload] }
    case PART_ACTIONS.RECEIVE_FAILURE:
      return {
        ...state,
        saveStatus: 'error',
        saveError: action.payload.message || null,
        receivedLines: [...state.receivedLines, ...action.payload.received],
      }
    case PART_ACTIONS.RESET_SAVE:
      return { ...state, saveStatus: 'idle', saveError: null, receivedLines: [] }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
