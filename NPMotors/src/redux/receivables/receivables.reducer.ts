import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { Receivable, ReceivableCustomerOption, ReceivableDetail, ReceivableQuery } from '../../types/receivables'
import type { ReceivablesAction } from './receivables.actions'
import { RECEIVABLE_ACTIONS } from './receivables.constants'

export interface ReceivablesState {
  items: Receivable[]
  hasNext: boolean
  query: ReceivableQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: ReceivableDetail | null
  detailStatus: RequestStatus
  detailError: string | null
  customerOptions: ReceivableCustomerOption[]
  customerOptionsStatus: RequestStatus
  customerOptionsError: string | null
}

export const initialReceivablesState: ReceivablesState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 10, status: 'all', customerId: 'all', asOfDate: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  customerOptions: [],
  customerOptionsStatus: 'idle',
  customerOptionsError: null,
}

const receivableActionTypes: ReadonlySet<string> = new Set(Object.values(RECEIVABLE_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isReceivablesAction = (action: UnknownAction): action is ReceivablesAction => receivableActionTypes.has(action.type)

export default function receivablesReducer(state: ReceivablesState = initialReceivablesState, action: UnknownAction): ReceivablesState {
  if (!isReceivablesAction(action)) return state

  switch (action.type) {
    case RECEIVABLE_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case RECEIVABLE_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case RECEIVABLE_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case RECEIVABLE_ACTIONS.SET_STATUS_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, status: action.payload, pageNumber: 1 } }
    case RECEIVABLE_ACTIONS.SET_CUSTOMER_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, customerId: action.payload, pageNumber: 1 } }
    case RECEIVABLE_ACTIONS.SET_AS_OF_DATE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, asOfDate: action.payload, pageNumber: 1 } }
    case RECEIVABLE_ACTIONS.RESET_FILTERS:
      return {
        ...state,
        listStatus: 'loading',
        listError: null,
        query: { ...state.query, status: 'all', customerId: 'all', asOfDate: '', pageNumber: 1 },
      }
    case RECEIVABLE_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case RECEIVABLE_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case RECEIVABLE_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case RECEIVABLE_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case RECEIVABLE_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case RECEIVABLE_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS:
      return { ...state, customerOptionsStatus: 'loading', customerOptionsError: null }
    case RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS_SUCCESS:
      return { ...state, customerOptions: action.payload, customerOptionsStatus: 'success' }
    case RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS_FAILURE:
      return { ...state, customerOptionsStatus: 'error', customerOptionsError: action.payload }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
