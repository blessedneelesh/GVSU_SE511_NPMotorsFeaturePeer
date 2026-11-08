import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { Transaction, TransactionAccountOption, TransactionQuery } from '../../types/transactions'
import type { TransactionsAction } from './transactions.actions'
import { TRANSACTION_ACTIONS } from './transactions.constants'

export interface TransactionsState {
  items: Transaction[]
  hasNext: boolean
  query: TransactionQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: Transaction | null
  detailStatus: RequestStatus
  detailError: string | null
  accountOptions: TransactionAccountOption[]
  accountOptionsStatus: RequestStatus
  accountOptionsError: string | null
}

export const initialTransactionsState: TransactionsState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, bankAccountId: 'all', direction: 'all', dateFrom: '', dateTo: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  accountOptions: [],
  accountOptionsStatus: 'idle',
  accountOptionsError: null,
}

const transactionActionTypes: ReadonlySet<string> = new Set(Object.values(TRANSACTION_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isTransactionsAction = (action: UnknownAction): action is TransactionsAction => transactionActionTypes.has(action.type)

export default function transactionsReducer(state: TransactionsState = initialTransactionsState, action: UnknownAction): TransactionsState {
  if (!isTransactionsAction(action)) return state

  switch (action.type) {
    case TRANSACTION_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case TRANSACTION_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case TRANSACTION_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case TRANSACTION_ACTIONS.SET_BANK_ACCOUNT_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, bankAccountId: action.payload, pageNumber: 1 } }
    case TRANSACTION_ACTIONS.SET_DIRECTION_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, direction: action.payload, pageNumber: 1 } }
    case TRANSACTION_ACTIONS.SET_DATE_FROM:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, dateFrom: action.payload, pageNumber: 1 } }
    case TRANSACTION_ACTIONS.SET_DATE_TO:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, dateTo: action.payload, pageNumber: 1 } }
    case TRANSACTION_ACTIONS.RESET_FILTERS:
      return { ...state, listStatus: 'loading', listError: null, query: { ...initialTransactionsState.query, pageSize: state.query.pageSize } }
    case TRANSACTION_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case TRANSACTION_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case TRANSACTION_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case TRANSACTION_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case TRANSACTION_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case TRANSACTION_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS:
      return { ...state, accountOptionsStatus: 'loading', accountOptionsError: null }
    case TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS:
      return { ...state, accountOptions: action.payload, accountOptionsStatus: 'success' }
    case TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE:
      return { ...state, accountOptionsStatus: 'error', accountOptionsError: action.payload }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
