import type {
  Transaction,
  TransactionAccountOption,
  TransactionBankAccountFilter,
  TransactionDirectionFilter,
  TransactionPage,
} from '../../types/transactions'
import { TRANSACTION_ACTIONS } from './transactions.constants'

export const loadTransactions = () => ({ type: TRANSACTION_ACTIONS.LOAD })

export const loadTransactionsSuccess = (page: TransactionPage) => ({ type: TRANSACTION_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadTransactionsFailure = (message: string) => ({ type: TRANSACTION_ACTIONS.LOAD_FAILURE, payload: message })

export const setTransactionBankAccountFilter = (bankAccountId: TransactionBankAccountFilter) => ({ type: TRANSACTION_ACTIONS.SET_BANK_ACCOUNT_FILTER, payload: bankAccountId })

export const setTransactionDirectionFilter = (direction: TransactionDirectionFilter) => ({ type: TRANSACTION_ACTIONS.SET_DIRECTION_FILTER, payload: direction })

// Dates are YYYY-MM-DD, or '' to clear the bound
export const setTransactionDateFrom = (date: string) => ({ type: TRANSACTION_ACTIONS.SET_DATE_FROM, payload: date })

export const setTransactionDateTo = (date: string) => ({ type: TRANSACTION_ACTIONS.SET_DATE_TO, payload: date })

// Clears every filter but keeps the page size
export const resetTransactionFilters = () => ({ type: TRANSACTION_ACTIONS.RESET_FILTERS })

export const setTransactionPage = (pageNumber: number) => ({ type: TRANSACTION_ACTIONS.SET_PAGE, payload: pageNumber })

export const setTransactionPageSize = (pageSize: number) => ({ type: TRANSACTION_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and fetches the transaction by id
export const selectTransaction = (id: string) => ({ type: TRANSACTION_ACTIONS.SELECT, payload: id })

export const clearTransactionSelection = () => ({ type: TRANSACTION_ACTIONS.CLEAR_SELECTION })

export const loadTransactionByIdSuccess = (transaction: Transaction) => ({ type: TRANSACTION_ACTIONS.LOAD_BY_ID_SUCCESS, payload: transaction })

export const loadTransactionByIdFailure = (message: string) => ({ type: TRANSACTION_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

// The bank accounts offered by the Bank Account filter
export const loadTransactionAccountOptions = () => ({ type: TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS })

export const loadTransactionAccountOptionsSuccess = (options: TransactionAccountOption[]) => ({ type: TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS, payload: options })

export const loadTransactionAccountOptionsFailure = (message: string) => ({ type: TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE, payload: message })

export type TransactionsAction =
  | ReturnType<typeof loadTransactions>
  | ReturnType<typeof loadTransactionsSuccess>
  | ReturnType<typeof loadTransactionsFailure>
  | ReturnType<typeof setTransactionBankAccountFilter>
  | ReturnType<typeof setTransactionDirectionFilter>
  | ReturnType<typeof setTransactionDateFrom>
  | ReturnType<typeof setTransactionDateTo>
  | ReturnType<typeof resetTransactionFilters>
  | ReturnType<typeof setTransactionPage>
  | ReturnType<typeof setTransactionPageSize>
  | ReturnType<typeof selectTransaction>
  | ReturnType<typeof clearTransactionSelection>
  | ReturnType<typeof loadTransactionByIdSuccess>
  | ReturnType<typeof loadTransactionByIdFailure>
  | ReturnType<typeof loadTransactionAccountOptions>
  | ReturnType<typeof loadTransactionAccountOptionsSuccess>
  | ReturnType<typeof loadTransactionAccountOptionsFailure>
