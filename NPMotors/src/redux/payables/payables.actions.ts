import type {
  PayableDetail,
  PayablePage,
  PayablePaymentHistory,
  PayableStatusFilter,
  PayableVendorFilter,
  PayableVendorOption,
  VendorPaymentRequest,
  VendorPaymentSaveError,
} from '../../types/payables'
import { PAYABLE_ACTIONS } from './payables.constants'

export const loadPayables = () => ({ type: PAYABLE_ACTIONS.LOAD })

export const loadPayablesSuccess = (page: PayablePage) => ({ type: PAYABLE_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadPayablesFailure = (message: string) => ({ type: PAYABLE_ACTIONS.LOAD_FAILURE, payload: message })

export const setPayableStatusFilter = (status: PayableStatusFilter) => ({ type: PAYABLE_ACTIONS.SET_STATUS_FILTER, payload: status })

export const setPayableVendorFilter = (vendorId: PayableVendorFilter) => ({ type: PAYABLE_ACTIONS.SET_VENDOR_FILTER, payload: vendorId })

// YYYY-MM-DD, or '' for today
export const setPayableAsOfDate = (asOfDate: string) => ({ type: PAYABLE_ACTIONS.SET_AS_OF_DATE, payload: asOfDate })

// Clears the status, vendor and as-of filters but keeps the page size
export const resetPayableFilters = () => ({ type: PAYABLE_ACTIONS.RESET_FILTERS })

export const setPayablePage = (pageNumber: number) => ({ type: PAYABLE_ACTIONS.SET_PAGE, payload: pageNumber })

export const setPayablePageSize = (pageSize: number) => ({ type: PAYABLE_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and loads the bill from GetApById
export const selectPayable = (id: string) => ({ type: PAYABLE_ACTIONS.SELECT, payload: id })

// Closes the detail view; also cancels an in-flight lookup
export const clearPayableSelection = () => ({ type: PAYABLE_ACTIONS.CLEAR_SELECTION })

export const loadPayableByIdSuccess = (payable: PayableDetail) => ({ type: PAYABLE_ACTIONS.LOAD_BY_ID_SUCCESS, payload: payable })

export const loadPayableByIdFailure = (message: string) => ({ type: PAYABLE_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

// Loads the payments of the given bill from GetPaymentHistory
export const loadPayablePaymentHistory = (apBillId: string) => ({ type: PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY, payload: apBillId })

export const loadPayablePaymentHistorySuccess = (history: PayablePaymentHistory) => ({ type: PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY_SUCCESS, payload: history })

export const loadPayablePaymentHistoryFailure = (message: string) => ({ type: PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY_FAILURE, payload: message })

// Forgets the payments when the bill is closed; also cancels an in-flight load
export const clearPayablePaymentHistory = () => ({ type: PAYABLE_ACTIONS.CLEAR_PAYMENT_HISTORY })

// Pays a bill (POST APBill/RecordVendorPayment/{apBillId})
export const recordVendorPayment = (request: VendorPaymentRequest) => ({ type: PAYABLE_ACTIONS.RECORD_PAYMENT, payload: request })

export const recordVendorPaymentSuccess = () => ({ type: PAYABLE_ACTIONS.RECORD_PAYMENT_SUCCESS })

export const recordVendorPaymentFailure = (error: VendorPaymentSaveError) => ({ type: PAYABLE_ACTIONS.RECORD_PAYMENT_FAILURE, payload: error })

// Clears the payment status and errors when the dialog opens or closes
export const resetPayableSave = () => ({ type: PAYABLE_ACTIONS.RESET_SAVE })

// The vendors offered in the vendor filter
export const loadPayableVendorOptions = () => ({ type: PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS })

export const loadPayableVendorOptionsSuccess = (options: PayableVendorOption[]) => ({ type: PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS, payload: options })

export const loadPayableVendorOptionsFailure = (message: string) => ({ type: PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE, payload: message })

export type PayablesAction =
  | ReturnType<typeof loadPayables>
  | ReturnType<typeof loadPayablesSuccess>
  | ReturnType<typeof loadPayablesFailure>
  | ReturnType<typeof setPayableStatusFilter>
  | ReturnType<typeof setPayableVendorFilter>
  | ReturnType<typeof setPayableAsOfDate>
  | ReturnType<typeof resetPayableFilters>
  | ReturnType<typeof setPayablePage>
  | ReturnType<typeof setPayablePageSize>
  | ReturnType<typeof selectPayable>
  | ReturnType<typeof clearPayableSelection>
  | ReturnType<typeof loadPayableByIdSuccess>
  | ReturnType<typeof loadPayableByIdFailure>
  | ReturnType<typeof loadPayablePaymentHistory>
  | ReturnType<typeof loadPayablePaymentHistorySuccess>
  | ReturnType<typeof loadPayablePaymentHistoryFailure>
  | ReturnType<typeof clearPayablePaymentHistory>
  | ReturnType<typeof recordVendorPayment>
  | ReturnType<typeof recordVendorPaymentSuccess>
  | ReturnType<typeof recordVendorPaymentFailure>
  | ReturnType<typeof resetPayableSave>
  | ReturnType<typeof loadPayableVendorOptions>
  | ReturnType<typeof loadPayableVendorOptionsSuccess>
  | ReturnType<typeof loadPayableVendorOptionsFailure>
