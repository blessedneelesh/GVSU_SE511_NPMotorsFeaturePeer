import type {
  ReceivableCustomerFilter,
  ReceivableCustomerOption,
  ReceivableDetail,
  ReceivablePage,
  ReceivableStatusFilter,
} from '../../types/receivables'
import { RECEIVABLE_ACTIONS } from './receivables.constants'

export const loadReceivables = () => ({ type: RECEIVABLE_ACTIONS.LOAD })

export const loadReceivablesSuccess = (page: ReceivablePage) => ({ type: RECEIVABLE_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadReceivablesFailure = (message: string) => ({ type: RECEIVABLE_ACTIONS.LOAD_FAILURE, payload: message })

export const setReceivableStatusFilter = (status: ReceivableStatusFilter) => ({ type: RECEIVABLE_ACTIONS.SET_STATUS_FILTER, payload: status })

export const setReceivableCustomerFilter = (customerId: ReceivableCustomerFilter) => ({ type: RECEIVABLE_ACTIONS.SET_CUSTOMER_FILTER, payload: customerId })

// YYYY-MM-DD, or '' for today
export const setReceivableAsOfDate = (asOfDate: string) => ({ type: RECEIVABLE_ACTIONS.SET_AS_OF_DATE, payload: asOfDate })

// Clears the status, customer and as-of filters but keeps the page size
export const resetReceivableFilters = () => ({ type: RECEIVABLE_ACTIONS.RESET_FILTERS })

export const setReceivablePage = (pageNumber: number) => ({ type: RECEIVABLE_ACTIONS.SET_PAGE, payload: pageNumber })

export const setReceivablePageSize = (pageSize: number) => ({ type: RECEIVABLE_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and loads the AR invoice from GetArById
export const selectReceivable = (id: string) => ({ type: RECEIVABLE_ACTIONS.SELECT, payload: id })

// Closes the detail view; also cancels an in-flight lookup
export const clearReceivableSelection = () => ({ type: RECEIVABLE_ACTIONS.CLEAR_SELECTION })

export const loadReceivableByIdSuccess = (receivable: ReceivableDetail) => ({ type: RECEIVABLE_ACTIONS.LOAD_BY_ID_SUCCESS, payload: receivable })

export const loadReceivableByIdFailure = (message: string) => ({ type: RECEIVABLE_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

// The customers offered in the customer filter
export const loadReceivableCustomerOptions = () => ({ type: RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS })

export const loadReceivableCustomerOptionsSuccess = (options: ReceivableCustomerOption[]) => ({ type: RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS_SUCCESS, payload: options })

export const loadReceivableCustomerOptionsFailure = (message: string) => ({ type: RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS_FAILURE, payload: message })

export type ReceivablesAction =
  | ReturnType<typeof loadReceivables>
  | ReturnType<typeof loadReceivablesSuccess>
  | ReturnType<typeof loadReceivablesFailure>
  | ReturnType<typeof setReceivableStatusFilter>
  | ReturnType<typeof setReceivableCustomerFilter>
  | ReturnType<typeof setReceivableAsOfDate>
  | ReturnType<typeof resetReceivableFilters>
  | ReturnType<typeof setReceivablePage>
  | ReturnType<typeof setReceivablePageSize>
  | ReturnType<typeof selectReceivable>
  | ReturnType<typeof clearReceivableSelection>
  | ReturnType<typeof loadReceivableByIdSuccess>
  | ReturnType<typeof loadReceivableByIdFailure>
  | ReturnType<typeof loadReceivableCustomerOptions>
  | ReturnType<typeof loadReceivableCustomerOptionsSuccess>
  | ReturnType<typeof loadReceivableCustomerOptionsFailure>
