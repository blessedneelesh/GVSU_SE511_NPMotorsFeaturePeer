import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type {
  Payable,
  PayableDetail,
  PayablePayment,
  PayableQuery,
  PayableVendorOption,
  VendorPaymentFieldErrors,
} from '../../types/payables'
import type { PayablesAction } from './payables.actions'
import { PAYABLE_ACTIONS } from './payables.constants'

export interface PayablesState {
  items: Payable[]
  hasNext: boolean
  query: PayableQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: PayableDetail | null
  detailStatus: RequestStatus
  detailError: string | null
  // The bill whose payments are loaded (or loading); null when no bill is open
  paymentHistoryBillId: string | null
  payments: PayablePayment[]
  paymentHistoryStatus: RequestStatus
  paymentHistoryError: string | null
  // Make Payment
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: VendorPaymentFieldErrors
  vendorOptions: PayableVendorOption[]
  vendorOptionsStatus: RequestStatus
  vendorOptionsError: string | null
  // Bank Payments: the vendor the open bills belong to, so another vendor's bills are never offered
  vendorBillsVendorId: string | null
  vendorBills: Payable[]
  vendorBillsStatus: RequestStatus
  vendorBillsError: string | null
}

export const initialPayablesState: PayablesState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 10, status: 'all', vendorId: 'all', asOfDate: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  paymentHistoryBillId: null,
  payments: [],
  paymentHistoryStatus: 'idle',
  paymentHistoryError: null,
  saveStatus: 'idle',
  saveError: null,
  fieldErrors: {},
  vendorOptions: [],
  vendorOptionsStatus: 'idle',
  vendorOptionsError: null,
  vendorBillsVendorId: null,
  vendorBills: [],
  vendorBillsStatus: 'idle',
  vendorBillsError: null,
}

const payableActionTypes: ReadonlySet<string> = new Set(Object.values(PAYABLE_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isPayablesAction = (action: UnknownAction): action is PayablesAction => payableActionTypes.has(action.type)

export default function payablesReducer(state: PayablesState = initialPayablesState, action: UnknownAction): PayablesState {
  if (!isPayablesAction(action)) return state

  switch (action.type) {
    case PAYABLE_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case PAYABLE_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case PAYABLE_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case PAYABLE_ACTIONS.SET_STATUS_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, status: action.payload, pageNumber: 1 } }
    case PAYABLE_ACTIONS.SET_VENDOR_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, vendorId: action.payload, pageNumber: 1 } }
    case PAYABLE_ACTIONS.SET_AS_OF_DATE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, asOfDate: action.payload, pageNumber: 1 } }
    case PAYABLE_ACTIONS.RESET_FILTERS:
      return {
        ...state,
        listStatus: 'loading',
        listError: null,
        query: { ...state.query, status: 'all', vendorId: 'all', asOfDate: '', pageNumber: 1 },
      }
    case PAYABLE_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case PAYABLE_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case PAYABLE_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case PAYABLE_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case PAYABLE_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case PAYABLE_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY: {
      // Reloading the same bill keeps its payments on screen; another bill starts empty
      const isSameBill = action.payload === state.paymentHistoryBillId
      return {
        ...state,
        paymentHistoryBillId: action.payload,
        payments: isSameBill ? state.payments : [],
        paymentHistoryStatus: 'loading',
        paymentHistoryError: null,
      }
    }
    case PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY_SUCCESS:
      if (action.payload.apBillId !== state.paymentHistoryBillId) return state
      return { ...state, payments: action.payload.payments, paymentHistoryStatus: 'success' }
    case PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY_FAILURE:
      return { ...state, paymentHistoryStatus: 'error', paymentHistoryError: action.payload }
    case PAYABLE_ACTIONS.CLEAR_PAYMENT_HISTORY:
      return { ...state, paymentHistoryBillId: null, payments: [], paymentHistoryStatus: 'idle', paymentHistoryError: null }
    // Both payment kinds share one save status: only one payment form is ever open
    case PAYABLE_ACTIONS.RECORD_PAYMENT:
    case PAYABLE_ACTIONS.RECORD_MISC_PAYMENT:
      return { ...state, saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case PAYABLE_ACTIONS.RECORD_PAYMENT_SUCCESS:
    case PAYABLE_ACTIONS.RECORD_MISC_PAYMENT_SUCCESS:
      return { ...state, saveStatus: 'success' }
    case PAYABLE_ACTIONS.RECORD_PAYMENT_FAILURE:
    case PAYABLE_ACTIONS.RECORD_MISC_PAYMENT_FAILURE:
      return { ...state, saveStatus: 'error', saveError: action.payload.message || null, fieldErrors: action.payload.fieldErrors }
    case PAYABLE_ACTIONS.RESET_SAVE:
      return { ...state, saveStatus: 'idle', saveError: null, fieldErrors: {} }
    case PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS:
      return { ...state, vendorOptionsStatus: 'loading', vendorOptionsError: null }
    case PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS:
      return { ...state, vendorOptions: action.payload, vendorOptionsStatus: 'success' }
    case PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE:
      return { ...state, vendorOptionsStatus: 'error', vendorOptionsError: action.payload }
    case PAYABLE_ACTIONS.LOAD_VENDOR_BILLS: {
      // Reloading the same vendor keeps their bills on screen; another vendor starts empty
      const isSameVendor = action.payload === state.vendorBillsVendorId
      return {
        ...state,
        vendorBillsVendorId: action.payload,
        vendorBills: isSameVendor ? state.vendorBills : [],
        vendorBillsStatus: 'loading',
        vendorBillsError: null,
      }
    }
    case PAYABLE_ACTIONS.LOAD_VENDOR_BILLS_SUCCESS:
      if (action.payload.vendorId !== state.vendorBillsVendorId) return state
      return { ...state, vendorBills: action.payload.bills, vendorBillsStatus: 'success' }
    case PAYABLE_ACTIONS.LOAD_VENDOR_BILLS_FAILURE:
      return { ...state, vendorBillsStatus: 'error', vendorBillsError: action.payload }
    case PAYABLE_ACTIONS.CLEAR_VENDOR_BILLS:
      return { ...state, vendorBillsVendorId: null, vendorBills: [], vendorBillsStatus: 'idle', vendorBillsError: null }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
