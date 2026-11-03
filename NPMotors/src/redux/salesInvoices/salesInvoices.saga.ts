import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { salesInvoicesApi } from '../../services/salesInvoices/salesInvoices.api'
import {
  getSalesInvoiceCancelErrorMessage,
  getSalesInvoiceDetailErrorMessage,
  getSalesInvoiceErrorMessage,
  getSalesInvoiceSaveError,
  OPTIONS_FALLBACK_MESSAGE,
} from '../../services/salesInvoices/salesInvoices.errors'
import type { SalesInvoice, SalesInvoiceOptions, SalesInvoicePage, SalesInvoiceQuery } from '../../types/salesInvoices'
import {
  type cancelSalesInvoice,
  cancelSalesInvoiceFailure,
  cancelSalesInvoiceSuccess,
  type clearSalesInvoiceSelection,
  type createSalesInvoice,
  loadSalesInvoiceByIdFailure,
  loadSalesInvoiceByIdSuccess,
  loadSalesInvoiceOptionsFailure,
  loadSalesInvoiceOptionsSuccess,
  loadSalesInvoices,
  loadSalesInvoicesFailure,
  loadSalesInvoicesSuccess,
  type postSalesInvoice,
  saveSalesInvoiceFailure,
  saveSalesInvoiceSuccess,
  selectSalesInvoice,
} from './salesInvoices.actions'
import { SALES_INVOICE_ACTIONS } from './salesInvoices.constants'
import { selectSalesInvoiceQuery, selectSelectedSalesInvoiceId } from './salesInvoices.selectors'

function* loadSalesInvoicesWorker(): SagaIterator {
  const query: SalesInvoiceQuery = yield select(selectSalesInvoiceQuery)
  const controller = new AbortController()
  try {
    const page: SalesInvoicePage = yield call(salesInvoicesApi.getSalesInvoices, query, controller.signal)
    yield put(loadSalesInvoicesSuccess(page))
  } catch (error) {
    const message = getSalesInvoiceErrorMessage(error)
    if (message) yield put(loadSalesInvoicesFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type SalesInvoiceDetailAction = ReturnType<typeof selectSalesInvoice> | ReturnType<typeof clearSalesInvoiceSelection>

function* loadSalesInvoiceByIdWorker(action: SalesInvoiceDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== SALES_INVOICE_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const invoice: SalesInvoice = yield call(salesInvoicesApi.getSalesInvoiceById, action.payload, controller.signal)
    yield put(loadSalesInvoiceByIdSuccess(invoice))
  } catch (error) {
    const message = getSalesInvoiceDetailErrorMessage(error)
    if (message) yield put(loadSalesInvoiceByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: SalesInvoiceOptions = yield call(salesInvoicesApi.getOptions, controller.signal)
    yield put(loadSalesInvoiceOptionsSuccess(options))
  } catch (error) {
    const message = getSalesInvoiceErrorMessage(error, OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadSalesInvoiceOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type SaveSalesInvoiceAction = ReturnType<typeof createSalesInvoice> | ReturnType<typeof postSalesInvoice>

// Save Draft and Post Invoice send the same body to different endpoints
function* saveSalesInvoiceWorker(action: SaveSalesInvoiceAction): SagaIterator {
  const save = action.type === SALES_INVOICE_ACTIONS.POST ? salesInvoicesApi.postSalesInvoice : salesInvoicesApi.addSalesInvoice
  try {
    yield call(save, action.payload)
    yield put(saveSalesInvoiceSuccess())
    // Paging is server-side, so refetch the current page instead of inserting the row locally
    yield put(loadSalesInvoices())
  } catch (error) {
    const saveError = getSalesInvoiceSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(saveSalesInvoiceFailure(saveError))
  }
}

function* cancelSalesInvoiceWorker(action: ReturnType<typeof cancelSalesInvoice>): SagaIterator {
  try {
    yield call(salesInvoicesApi.cancelSalesInvoice, action.payload)
    yield put(cancelSalesInvoiceSuccess())
    yield put(loadSalesInvoices())
    // Cancelling from the detail view: reload it so the banner shows the cancellation and its reason
    const selectedId: string | null = yield select(selectSelectedSalesInvoiceId)
    if (selectedId === action.payload.id) yield put(selectSalesInvoice(selectedId))
  } catch (error) {
    const message = getSalesInvoiceCancelErrorMessage(error)
    if (message) yield put(cancelSalesInvoiceFailure(message))
  }
}

export default function* salesInvoicesSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        SALES_INVOICE_ACTIONS.LOAD,
        SALES_INVOICE_ACTIONS.SET_STATUS_FILTER,
        SALES_INVOICE_ACTIONS.SET_FROM_DATE,
        SALES_INVOICE_ACTIONS.SET_TO_DATE,
        SALES_INVOICE_ACTIONS.SET_PAGE,
        SALES_INVOICE_ACTIONS.SET_PAGE_SIZE,
        SALES_INVOICE_ACTIONS.SET_SEARCH,
      ],
      loadSalesInvoicesWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([SALES_INVOICE_ACTIONS.SELECT, SALES_INVOICE_ACTIONS.CLEAR_SELECTION], loadSalesInvoiceByIdWorker),
    // Reopening the form while a lookup is in flight restarts it instead of running two
    takeLatest(SALES_INVOICE_ACTIONS.LOAD_OPTIONS, loadOptionsWorker),
    // takeLeading ignores repeat submits while a save is in flight, so a double-click can't create two invoices.
    // Draft and post share one watcher, so clicking both buttons quickly also only saves once.
    takeLeading([SALES_INVOICE_ACTIONS.CREATE, SALES_INVOICE_ACTIONS.POST], saveSalesInvoiceWorker),
    takeLeading(SALES_INVOICE_ACTIONS.CANCEL, cancelSalesInvoiceWorker),
  ])
}
