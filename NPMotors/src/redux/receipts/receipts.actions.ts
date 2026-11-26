import type {
  ArPaymentRequest,
  MiscReceiptRequest,
  ReceiptBankAccountOption,
  ReceiptCustomerInvoices,
  ReceiptPaymentHistory,
  ReceiptSaveError,
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

// Bank Receipts from someone other than a customer invoice
export const recordMiscReceipt = (request: MiscReceiptRequest) => ({ type: RECEIPT_ACTIONS.RECORD_MISC_RECEIPT, payload: request })

export const recordMiscReceiptSuccess = () => ({ type: RECEIPT_ACTIONS.RECORD_MISC_RECEIPT_SUCCESS })

export const recordMiscReceiptFailure = (error: ReceiptSaveError) => ({ type: RECEIPT_ACTIONS.RECORD_MISC_RECEIPT_FAILURE, payload: error })

// The open AR invoices of the customer picked on Bank Receipts
export const loadReceiptCustomerInvoices = (customerId: string) => ({ type: RECEIPT_ACTIONS.LOAD_CUSTOMER_INVOICES, payload: customerId })

export const loadReceiptCustomerInvoicesSuccess = (result: ReceiptCustomerInvoices) => ({ type: RECEIPT_ACTIONS.LOAD_CUSTOMER_INVOICES_SUCCESS, payload: result })

export const loadReceiptCustomerInvoicesFailure = (message: string) => ({ type: RECEIPT_ACTIONS.LOAD_CUSTOMER_INVOICES_FAILURE, payload: message })

// No customer picked any more: cancels an in-flight load and forgets the invoices
export const clearReceiptCustomerInvoices = () => ({ type: RECEIPT_ACTIONS.CLEAR_CUSTOMER_INVOICES })

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
  | ReturnType<typeof recordMiscReceipt>
  | ReturnType<typeof recordMiscReceiptSuccess>
  | ReturnType<typeof recordMiscReceiptFailure>
  | ReturnType<typeof loadReceiptCustomerInvoices>
  | ReturnType<typeof loadReceiptCustomerInvoicesSuccess>
  | ReturnType<typeof loadReceiptCustomerInvoicesFailure>
  | ReturnType<typeof clearReceiptCustomerInvoices>
