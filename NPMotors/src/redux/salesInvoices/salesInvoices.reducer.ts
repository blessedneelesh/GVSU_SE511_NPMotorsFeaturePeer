import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type {
  SalesInvoice,
  SalesInvoiceFieldErrors,
  SalesInvoiceOptions,
  SalesInvoiceQuery,
  SalesInvoiceSaveMode,
} from '../../types/salesInvoices'
import type { SalesInvoicesAction } from './salesInvoices.actions'
import { SALES_INVOICE_ACTIONS } from './salesInvoices.constants'

export interface SalesInvoicesState {
  items: SalesInvoice[]
  hasNext: boolean
  query: SalesInvoiceQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: SalesInvoice | null
  detailStatus: RequestStatus
  detailError: string | null
  options: SalesInvoiceOptions
  optionsStatus: RequestStatus
  optionsError: string | null
  // Which button started the save, so the success banner can say "draft saved" or "invoice posted"
  saveMode: SalesInvoiceSaveMode | null
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: SalesInvoiceFieldErrors
  cancelStatus: RequestStatus
  cancelError: string | null
}

export const initialSalesInvoicesState: SalesInvoicesState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, status: 'all', fromDate: '', toDate: '', searchTerm: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  options: { customers: [], employees: [], salespeople: [], vehicles: [] },
  optionsStatus: 'idle',
  optionsError: null,
  saveMode: null,
  saveStatus: 'idle',
  saveError: null,
  fieldErrors: {},
  cancelStatus: 'idle',
  cancelError: null,
}

const salesInvoiceActionTypes: ReadonlySet<string> = new Set(Object.values(SALES_INVOICE_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isSalesInvoicesAction = (action: UnknownAction): action is SalesInvoicesAction => salesInvoiceActionTypes.has(action.type)

export default function salesInvoicesReducer(
  state: SalesInvoicesState = initialSalesInvoicesState,
  action: UnknownAction,
): SalesInvoicesState {
  if (!isSalesInvoicesAction(action)) return state

  switch (action.type) {
    case SALES_INVOICE_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case SALES_INVOICE_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case SALES_INVOICE_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case SALES_INVOICE_ACTIONS.SET_SEARCH:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, searchTerm: action.payload, pageNumber: 1 } }
    case SALES_INVOICE_ACTIONS.SET_STATUS_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, status: action.payload, pageNumber: 1 } }
    case SALES_INVOICE_ACTIONS.SET_FROM_DATE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, fromDate: action.payload, pageNumber: 1 } }
    case SALES_INVOICE_ACTIONS.SET_TO_DATE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, toDate: action.payload, pageNumber: 1 } }
    case SALES_INVOICE_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case SALES_INVOICE_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case SALES_INVOICE_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case SALES_INVOICE_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case SALES_INVOICE_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case SALES_INVOICE_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case SALES_INVOICE_ACTIONS.LOAD_OPTIONS:
      return { ...state, optionsStatus: 'loading', optionsError: null }
    case SALES_INVOICE_ACTIONS.LOAD_OPTIONS_SUCCESS:
      return { ...state, options: action.payload, optionsStatus: 'success' }
    case SALES_INVOICE_ACTIONS.LOAD_OPTIONS_FAILURE:
      return { ...state, optionsStatus: 'error', optionsError: action.payload }
    // takeLeading drops a save sent while another is in flight; ignore it here too so saveMode stays accurate
    case SALES_INVOICE_ACTIONS.CREATE:
      if (state.saveStatus === 'loading') return state
      return { ...state, saveMode: 'draft', saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case SALES_INVOICE_ACTIONS.POST:
      if (state.saveStatus === 'loading') return state
      return { ...state, saveMode: 'post', saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case SALES_INVOICE_ACTIONS.SAVE_SUCCESS:
      return { ...state, saveStatus: 'success' }
    case SALES_INVOICE_ACTIONS.SAVE_FAILURE:
      return { ...state, saveStatus: 'error', saveError: action.payload.message || null, fieldErrors: action.payload.fieldErrors }
    case SALES_INVOICE_ACTIONS.RESET_SAVE:
      return { ...state, saveMode: null, saveStatus: 'idle', saveError: null, fieldErrors: {} }
    case SALES_INVOICE_ACTIONS.CANCEL:
      return { ...state, cancelStatus: 'loading', cancelError: null }
    case SALES_INVOICE_ACTIONS.CANCEL_SUCCESS:
      return { ...state, cancelStatus: 'success' }
    case SALES_INVOICE_ACTIONS.CANCEL_FAILURE:
      return { ...state, cancelStatus: 'error', cancelError: action.payload }
    case SALES_INVOICE_ACTIONS.RESET_CANCEL:
      return { ...state, cancelStatus: 'idle', cancelError: null }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
