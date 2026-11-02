import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { Customer, CustomerQuery } from '../../types/customers'
import type { CustomersAction } from './customers.actions'
import { CUSTOMER_ACTIONS } from './customers.constants'

export interface CustomersState {
  items: Customer[]
  hasNext: boolean
  query: CustomerQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: Customer | null
  detailStatus: RequestStatus
  detailError: string | null
}

export const initialCustomersState: CustomersState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, status: 'all', searchTerm: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
}

const customerActionTypes: ReadonlySet<string> = new Set(Object.values(CUSTOMER_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isCustomersAction = (action: UnknownAction): action is CustomersAction => customerActionTypes.has(action.type)

export default function customersReducer(state: CustomersState = initialCustomersState, action: UnknownAction): CustomersState {
  if (!isCustomersAction(action)) return state

  switch (action.type) {
    case CUSTOMER_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case CUSTOMER_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case CUSTOMER_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case CUSTOMER_ACTIONS.SET_SEARCH:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, searchTerm: action.payload, pageNumber: 1 } }
    case CUSTOMER_ACTIONS.SET_STATUS_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, status: action.payload, pageNumber: 1 } }
    case CUSTOMER_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case CUSTOMER_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case CUSTOMER_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case CUSTOMER_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case CUSTOMER_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case CUSTOMER_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
