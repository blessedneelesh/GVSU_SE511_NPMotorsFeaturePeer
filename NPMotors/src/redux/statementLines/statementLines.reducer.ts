import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { StatementLine, StatementLineAccountOption, StatementLineQuery } from '../../types/statementLines'
import type { StatementLinesAction } from './statementLines.actions'
import { STATEMENT_LINE_ACTIONS } from './statementLines.constants'

export interface StatementLinesState {
  items: StatementLine[]
  hasNext: boolean
  query: StatementLineQuery
  listStatus: RequestStatus
  listError: string | null
  accountOptions: StatementLineAccountOption[]
  accountOptionsStatus: RequestStatus
  accountOptionsError: string | null
}

export const initialStatementLinesState: StatementLinesState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, bankAccountId: 'all', month: '', type: 'all' },
  listStatus: 'idle',
  listError: null,
  accountOptions: [],
  accountOptionsStatus: 'idle',
  accountOptionsError: null,
}

const statementLineActionTypes: ReadonlySet<string> = new Set(Object.values(STATEMENT_LINE_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isStatementLinesAction = (action: UnknownAction): action is StatementLinesAction => statementLineActionTypes.has(action.type)

export default function statementLinesReducer(state: StatementLinesState = initialStatementLinesState, action: UnknownAction): StatementLinesState {
  if (!isStatementLinesAction(action)) return state

  switch (action.type) {
    case STATEMENT_LINE_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case STATEMENT_LINE_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case STATEMENT_LINE_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case STATEMENT_LINE_ACTIONS.SET_BANK_ACCOUNT_FILTER:
      return {
        ...state,
        listStatus: 'loading',
        listError: null,
        query: { ...state.query, bankAccountId: action.payload, month: '', type: 'all', pageNumber: 1 },
      }
    case STATEMENT_LINE_ACTIONS.SET_MONTH_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, month: action.payload, pageNumber: 1 } }
    case STATEMENT_LINE_ACTIONS.SET_TYPE_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, type: action.payload, pageNumber: 1 } }
    case STATEMENT_LINE_ACTIONS.RESET_FILTERS:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, month: '', type: 'all', pageNumber: 1 } }
    case STATEMENT_LINE_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case STATEMENT_LINE_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS:
      return { ...state, accountOptionsStatus: 'loading', accountOptionsError: null }
    case STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS:
      return { ...state, accountOptions: action.payload, accountOptionsStatus: 'success' }
    case STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE:
      return { ...state, accountOptionsStatus: 'error', accountOptionsError: action.payload }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
