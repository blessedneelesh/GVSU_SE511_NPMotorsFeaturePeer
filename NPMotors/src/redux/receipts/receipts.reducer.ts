import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { ReceiptBankAccountOption, ReceiptFieldErrors, ReceiptPayment } from '../../types/receipts'
import type { ReceiptsAction } from './receipts.actions'
import { RECEIPT_ACTIONS } from './receipts.constants'

export interface ReceiptsState {
  bankAccountOptions: ReceiptBankAccountOption[]
  bankAccountOptionsStatus: RequestStatus
  bankAccountOptionsError: string | null
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: ReceiptFieldErrors
  // The AR invoice the payments belong to, so another invoice's payments are never shown
  paymentHistoryInvoiceId: string | null
  payments: ReceiptPayment[]
  paymentHistoryStatus: RequestStatus
  paymentHistoryError: string | null
}

export const initialReceiptsState: ReceiptsState = {
  bankAccountOptions: [],
  bankAccountOptionsStatus: 'idle',
  bankAccountOptionsError: null,
  saveStatus: 'idle',
  saveError: null,
  fieldErrors: {},
  paymentHistoryInvoiceId: null,
  payments: [],
  paymentHistoryStatus: 'idle',
  paymentHistoryError: null,
}

const receiptActionTypes: ReadonlySet<string> = new Set(Object.values(RECEIPT_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isReceiptsAction = (action: UnknownAction): action is ReceiptsAction => receiptActionTypes.has(action.type)

export default function receiptsReducer(state: ReceiptsState = initialReceiptsState, action: UnknownAction): ReceiptsState {
  if (!isReceiptsAction(action)) return state

  switch (action.type) {
    case RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS:
      return { ...state, bankAccountOptionsStatus: 'loading', bankAccountOptionsError: null }
    case RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_SUCCESS:
      return { ...state, bankAccountOptions: action.payload, bankAccountOptionsStatus: 'success' }
    case RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_FAILURE:
      return { ...state, bankAccountOptionsStatus: 'error', bankAccountOptionsError: action.payload }
    case RECEIPT_ACTIONS.RECORD_AR_PAYMENT:
      return { ...state, saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case RECEIPT_ACTIONS.RECORD_AR_PAYMENT_SUCCESS:
      return { ...state, saveStatus: 'success' }
    case RECEIPT_ACTIONS.RECORD_AR_PAYMENT_FAILURE:
      return { ...state, saveStatus: 'error', saveError: action.payload.message || null, fieldErrors: action.payload.fieldErrors }
    case RECEIPT_ACTIONS.RESET_SAVE:
      return { ...state, saveStatus: 'idle', saveError: null, fieldErrors: {} }
    case RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY: {
      // Reloading the same invoice keeps its payments on screen; another invoice starts empty
      const isSameInvoice = action.payload === state.paymentHistoryInvoiceId
      return {
        ...state,
        paymentHistoryInvoiceId: action.payload,
        payments: isSameInvoice ? state.payments : [],
        paymentHistoryStatus: 'loading',
        paymentHistoryError: null,
      }
    }
    case RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY_SUCCESS:
      if (action.payload.arInvoiceId !== state.paymentHistoryInvoiceId) return state
      return { ...state, payments: action.payload.payments, paymentHistoryStatus: 'success' }
    case RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY_FAILURE:
      return { ...state, paymentHistoryStatus: 'error', paymentHistoryError: action.payload }
    case RECEIPT_ACTIONS.CLEAR_PAYMENT_HISTORY:
      return { ...state, paymentHistoryInvoiceId: null, payments: [], paymentHistoryStatus: 'idle', paymentHistoryError: null }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
