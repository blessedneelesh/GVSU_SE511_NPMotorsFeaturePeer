import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { BankAccount, BankAccountFieldErrors, BankAccountQuery, BankOption } from '../../types/bankAccounts'
import type { BankAccountsAction } from './bankAccounts.actions'
import { BANK_ACCOUNT_ACTIONS } from './bankAccounts.constants'

export interface BankAccountsState {
  items: BankAccount[]
  hasNext: boolean
  query: BankAccountQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: BankAccount | null
  detailStatus: RequestStatus
  detailError: string | null
  bankOptions: BankOption[]
  bankOptionsStatus: RequestStatus
  bankOptionsError: string | null
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: BankAccountFieldErrors
}

export const initialBankAccountsState: BankAccountsState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, bankId: 'all', searchTerm: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  bankOptions: [],
  bankOptionsStatus: 'idle',
  bankOptionsError: null,
  saveStatus: 'idle',
  saveError: null,
  fieldErrors: {},
}

const bankAccountActionTypes: ReadonlySet<string> = new Set(Object.values(BANK_ACCOUNT_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isBankAccountsAction = (action: UnknownAction): action is BankAccountsAction => bankAccountActionTypes.has(action.type)

export default function bankAccountsReducer(state: BankAccountsState = initialBankAccountsState, action: UnknownAction): BankAccountsState {
  if (!isBankAccountsAction(action)) return state

  switch (action.type) {
    case BANK_ACCOUNT_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case BANK_ACCOUNT_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case BANK_ACCOUNT_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case BANK_ACCOUNT_ACTIONS.SET_SEARCH:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, searchTerm: action.payload, pageNumber: 1 } }
    case BANK_ACCOUNT_ACTIONS.SET_BANK_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, bankId: action.payload, pageNumber: 1 } }
    case BANK_ACCOUNT_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case BANK_ACCOUNT_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case BANK_ACCOUNT_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case BANK_ACCOUNT_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case BANK_ACCOUNT_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case BANK_ACCOUNT_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS:
      return { ...state, bankOptionsStatus: 'loading', bankOptionsError: null }
    case BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS_SUCCESS:
      return { ...state, bankOptions: action.payload, bankOptionsStatus: 'success' }
    case BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS_FAILURE:
      return { ...state, bankOptionsStatus: 'error', bankOptionsError: action.payload }
    case BANK_ACCOUNT_ACTIONS.CREATE:
      return { ...state, saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case BANK_ACCOUNT_ACTIONS.CREATE_SUCCESS:
      return { ...state, saveStatus: 'success' }
    case BANK_ACCOUNT_ACTIONS.CREATE_FAILURE:
      return { ...state, saveStatus: 'error', saveError: action.payload.message || null, fieldErrors: action.payload.fieldErrors }
    case BANK_ACCOUNT_ACTIONS.RESET_SAVE:
      return { ...state, saveStatus: 'idle', saveError: null, fieldErrors: {} }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
