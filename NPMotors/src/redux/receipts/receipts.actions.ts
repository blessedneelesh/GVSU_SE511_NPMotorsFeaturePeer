import type { ArPaymentRequest, ReceiptBankAccountOption, ReceiptSaveError } from '../../types/receipts'
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

export type ReceiptsAction =
  | ReturnType<typeof loadReceiptBankAccountOptions>
  | ReturnType<typeof loadReceiptBankAccountOptionsSuccess>
  | ReturnType<typeof loadReceiptBankAccountOptionsFailure>
  | ReturnType<typeof recordArPayment>
  | ReturnType<typeof recordArPaymentSuccess>
  | ReturnType<typeof recordArPaymentFailure>
  | ReturnType<typeof resetReceiptSave>
