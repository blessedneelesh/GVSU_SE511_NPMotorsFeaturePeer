import type {
  ArPaymentRequest,
  ReceiptBankAccountOption,
  ReceiptPaymentHistory,
  ReceiptSaveError,
  SalesInvoicePayments,
  SalesInvoicePaymentsRequest,
} from '../../types/receipts'
import { RECEIPT_ACTIONS } from './receipts.constants'

// The Deposit To accounts
export const loadReceiptBankAccountOptions = () => ({ type: RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS })

export const loadReceiptBankAccountOptionsSuccess = (options: ReceiptBankAccountOption[]) => ({ type: RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_SUCCESS, payload: options })

export const loadReceiptBankAccountOptionsFailure = (message: string) => ({ type: RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_FAILURE, payload: message })

export const recordArPayment = (request: ArPaymentRequest) => ({ type: RECEIPT_ACTIONS.RECORD_AR_PAYMENT, payload: request })

export const recordArPaymentSuccess = () => ({ type: RECEIPT_ACTIONS.RECORD_AR_PAYMENT_SUCCESS })

export const recordArPaymentFailure = (error: ReceiptSaveError) => ({ type: RECEIPT_ACTIONS.RECORD_AR_PAYMENT_FAILURE, payload: error })

// Clears the save status and errors, e.g. when the payment dialog is opened or closed
export const resetReceiptSave = () => ({ type: RECEIPT_ACTIONS.RESET_SAVE })

// The payments posted against one AR invoice
export const loadPaymentHistory = (arInvoiceId: string) => ({ type: RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY, payload: arInvoiceId })

export const loadPaymentHistorySuccess = (history: ReceiptPaymentHistory) => ({ type: RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY_SUCCESS, payload: history })

export const loadPaymentHistoryFailure = (message: string) => ({ type: RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY_FAILURE, payload: message })

// Leaving the invoice: cancels an in-flight load and forgets its payments
export const clearPaymentHistory = () => ({ type: RECEIPT_ACTIONS.CLEAR_PAYMENT_HISTORY })

// The receipts of a sales invoice, for its Payment History tab
export const loadSalesInvoicePayments = (request: SalesInvoicePaymentsRequest) => ({ type: RECEIPT_ACTIONS.LOAD_SALES_INVOICE_PAYMENTS, payload: request })

export const loadSalesInvoicePaymentsSuccess = (result: SalesInvoicePayments) => ({ type: RECEIPT_ACTIONS.LOAD_SALES_INVOICE_PAYMENTS_SUCCESS, payload: result })

export const loadSalesInvoicePaymentsFailure = (message: string) => ({ type: RECEIPT_ACTIONS.LOAD_SALES_INVOICE_PAYMENTS_FAILURE, payload: message })

// Leaving the tab: cancels an in-flight load and forgets the payments
export const clearSalesInvoicePayments = () => ({ type: RECEIPT_ACTIONS.CLEAR_SALES_INVOICE_PAYMENTS })

export type ReceiptsAction =
  | ReturnType<typeof loadReceiptBankAccountOptions>
  | ReturnType<typeof loadReceiptBankAccountOptionsSuccess>
  | ReturnType<typeof loadReceiptBankAccountOptionsFailure>
  | ReturnType<typeof recordArPayment>
  | ReturnType<typeof recordArPaymentSuccess>
  | ReturnType<typeof recordArPaymentFailure>
  | ReturnType<typeof resetReceiptSave>
  | ReturnType<typeof loadPaymentHistory>
  | ReturnType<typeof loadPaymentHistorySuccess>
  | ReturnType<typeof loadPaymentHistoryFailure>
  | ReturnType<typeof clearPaymentHistory>
  | ReturnType<typeof loadSalesInvoicePayments>
  | ReturnType<typeof loadSalesInvoicePaymentsSuccess>
  | ReturnType<typeof loadSalesInvoicePaymentsFailure>
  | ReturnType<typeof clearSalesInvoicePayments>
