import type {
  StatementLineAccountOption,
  StatementLineBankAccountFilter,
  StatementLinePage,
  StatementLineTypeFilter,
} from '../../types/statementLines'
import { STATEMENT_LINE_ACTIONS } from './statementLines.constants'

export const loadStatementLines = () => ({ type: STATEMENT_LINE_ACTIONS.LOAD })

export const loadStatementLinesSuccess = (page: StatementLinePage) => ({ type: STATEMENT_LINE_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadStatementLinesFailure = (message: string) => ({ type: STATEMENT_LINE_ACTIONS.LOAD_FAILURE, payload: message })

// Switching account tabs also clears the month and type filters, as the design does
export const setStatementLineBankAccountFilter = (bankAccountId: StatementLineBankAccountFilter) => ({ type: STATEMENT_LINE_ACTIONS.SET_BANK_ACCOUNT_FILTER, payload: bankAccountId })

// YYYY-MM, or '' for every month
export const setStatementLineMonthFilter = (month: string) => ({ type: STATEMENT_LINE_ACTIONS.SET_MONTH_FILTER, payload: month })

export const setStatementLineTypeFilter = (type: StatementLineTypeFilter) => ({ type: STATEMENT_LINE_ACTIONS.SET_TYPE_FILTER, payload: type })

// Clears the month and type filters but keeps the account tab and page size
export const resetStatementLineFilters = () => ({ type: STATEMENT_LINE_ACTIONS.RESET_FILTERS })

export const setStatementLinePage = (pageNumber: number) => ({ type: STATEMENT_LINE_ACTIONS.SET_PAGE, payload: pageNumber })

export const setStatementLinePageSize = (pageSize: number) => ({ type: STATEMENT_LINE_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// The bank accounts shown as tabs
export const loadStatementLineAccountOptions = () => ({ type: STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS })

export const loadStatementLineAccountOptionsSuccess = (options: StatementLineAccountOption[]) => ({ type: STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS, payload: options })

export const loadStatementLineAccountOptionsFailure = (message: string) => ({ type: STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE, payload: message })

export type StatementLinesAction =
  | ReturnType<typeof loadStatementLines>
  | ReturnType<typeof loadStatementLinesSuccess>
  | ReturnType<typeof loadStatementLinesFailure>
  | ReturnType<typeof setStatementLineBankAccountFilter>
  | ReturnType<typeof setStatementLineMonthFilter>
  | ReturnType<typeof setStatementLineTypeFilter>
  | ReturnType<typeof resetStatementLineFilters>
  | ReturnType<typeof setStatementLinePage>
  | ReturnType<typeof setStatementLinePageSize>
  | ReturnType<typeof loadStatementLineAccountOptions>
  | ReturnType<typeof loadStatementLineAccountOptionsSuccess>
  | ReturnType<typeof loadStatementLineAccountOptionsFailure>
