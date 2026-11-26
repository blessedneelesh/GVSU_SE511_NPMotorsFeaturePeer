import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { Payable, PayableDetail, PayablePayment, PayableQuery, PayableVendorOption } from '../../types/payables'
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
  vendorOptions: PayableVendorOption[]
  vendorOptionsStatus: RequestStatus
  vendorOptionsError: string | null
}

export const initialPayablesState: PayablesState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, status: 'all', vendorId: 'all', asOfDate: '' },
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
  vendorOptions: [],
  vendorOptionsStatus: 'idle',
  vendorOptionsError: null,
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
    case PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS:
      return { ...state, vendorOptionsStatus: 'loading', vendorOptionsError: null }
    case PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS:
      return { ...state, vendorOptions: action.payload, vendorOptionsStatus: 'success' }
    case PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE:
      return { ...state, vendorOptionsStatus: 'error', vendorOptionsError: action.payload }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
