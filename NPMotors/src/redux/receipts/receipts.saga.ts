import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { receiptsApi } from '../../services/receipts/receipts.api'
import {
  AR_LOOKUP_FALLBACK_MESSAGE,
  BANK_ACCOUNT_OPTIONS_FALLBACK_MESSAGE,
  getReceiptErrorMessage,
  getReceiptSaveError,
  PAYMENT_HISTORY_FALLBACK_MESSAGE,
} from '../../services/receipts/receipts.errors'
import type { ReceiptBankAccountOption, ReceiptPayment } from '../../types/receipts'
import { loadReceivables, selectReceivable } from '../receivables/receivables.actions'
import { selectSelectedReceivableId } from '../receivables/receivables.selectors'
import { loadSalesInvoices, selectSalesInvoice } from '../salesInvoices/salesInvoices.actions'
import { selectSelectedSalesInvoiceId } from '../salesInvoices/salesInvoices.selectors'
import {
  type clearPaymentHistory,
  type clearSalesInvoiceAr,
  type clearSalesInvoicePayments,
  type findSalesInvoiceAr,
  findSalesInvoiceArFailure,
  findSalesInvoiceArSuccess,
  loadPaymentHistory,
  loadPaymentHistoryFailure,
  loadPaymentHistorySuccess,
  loadReceiptBankAccountOptionsFailure,
  type loadSalesInvoicePayments,
  loadSalesInvoicePaymentsFailure,
  loadSalesInvoicePaymentsSuccess,
  loadReceiptBankAccountOptionsSuccess,
  type recordArPayment,
  recordArPaymentFailure,
  recordArPaymentSuccess,
} from './receipts.actions'
import { RECEIPT_ACTIONS } from './receipts.constants'
import { selectArLookupArInvoiceId, selectArLookupSalesInvoiceId } from './receipts.selectors'

function* loadBankAccountOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: ReceiptBankAccountOption[] = yield call(receiptsApi.getBankAccountOptions, controller.signal)
    yield put(loadReceiptBankAccountOptionsSuccess(options))
  } catch (error) {
    const message = getReceiptErrorMessage(error, BANK_ACCOUNT_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadReceiptBankAccountOptionsFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadPaymentHistoryWorker(action: ReturnType<typeof loadPaymentHistory> | ReturnType<typeof clearPaymentHistory>): SagaIterator {
  // CLEAR_PAYMENT_HISTORY only exists so takeLatest cancels an in-flight load when the invoice is closed
  if (action.type !== RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY) return
  const arInvoiceId = action.payload
  const controller = new AbortController()
  try {
    const payments: ReceiptPayment[] = yield call(receiptsApi.getPaymentHistory, arInvoiceId, controller.signal)
    yield put(loadPaymentHistorySuccess({ arInvoiceId, payments }))
  } catch (error) {
    const message = getReceiptErrorMessage(error, PAYMENT_HISTORY_FALLBACK_MESSAGE)
    if (message) yield put(loadPaymentHistoryFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadSalesInvoicePaymentsWorker(
  action: ReturnType<typeof loadSalesInvoicePayments> | ReturnType<typeof clearSalesInvoicePayments>,
): SagaIterator {
  // CLEAR_SALES_INVOICE_PAYMENTS only exists so takeLatest cancels an in-flight load when the tab closes
  if (action.type !== RECEIPT_ACTIONS.LOAD_SALES_INVOICE_PAYMENTS) return
  const request = action.payload
  const controller = new AbortController()
  try {
    const payments: ReceiptPayment[] = yield call(receiptsApi.getSalesInvoicePayments, request, controller.signal)
    yield put(loadSalesInvoicePaymentsSuccess({ salesInvoiceId: request.salesInvoiceId, payments }))
  } catch (error) {
    const message = getReceiptErrorMessage(error, PAYMENT_HISTORY_FALLBACK_MESSAGE)
    if (message) yield put(loadSalesInvoicePaymentsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* findSalesInvoiceArWorker(action: ReturnType<typeof findSalesInvoiceAr> | ReturnType<typeof clearSalesInvoiceAr>): SagaIterator {
  // CLEAR_SALES_INVOICE_AR only exists so takeLatest cancels an in-flight lookup when the dialog closes
  if (action.type !== RECEIPT_ACTIONS.FIND_SALES_INVOICE_AR) return
  const request = action.payload
  const controller = new AbortController()
  try {
    const arInvoiceId: string | null = yield call(receiptsApi.findArInvoiceId, request, controller.signal)
    yield put(findSalesInvoiceArSuccess({ salesInvoiceId: request.salesInvoiceId, arInvoiceId }))
  } catch (error) {
    const message = getReceiptErrorMessage(error, AR_LOOKUP_FALLBACK_MESSAGE)
    if (message) yield put(findSalesInvoiceArFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* recordArPaymentWorker(action: ReturnType<typeof recordArPayment>): SagaIterator {
  try {
    yield call(receiptsApi.recordArPayment, action.payload)
    yield put(recordArPaymentSuccess())
    // The paid amount, balance and status changed: refetch the AR page, and the open invoice and its payments if it's the one paid
    yield put(loadReceivables())
    const selectedId: string | null = yield select(selectSelectedReceivableId)
    if (selectedId === action.payload.arInvoiceId) {
      yield put(selectReceivable(selectedId))
      yield put(loadPaymentHistory(selectedId))
    }
    // Paid from the open sales invoice: reload it, and the sales invoice list, so the paid amount, balance and status update
    const salesInvoiceId: string | null = yield select(selectSelectedSalesInvoiceId)
    const lookupSalesInvoiceId: string | null = yield select(selectArLookupSalesInvoiceId)
    const lookupArInvoiceId: string | null = yield select(selectArLookupArInvoiceId)
    if (salesInvoiceId && salesInvoiceId === lookupSalesInvoiceId && lookupArInvoiceId === action.payload.arInvoiceId) {
      yield put(loadSalesInvoices())
      yield put(selectSalesInvoice(salesInvoiceId))
    }
  } catch (error) {
    const saveError = getReceiptSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(recordArPaymentFailure(saveError))
  }
}

export default function* receiptsSaga(): SagaIterator {
  yield all([
    takeLatest(RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS, loadBankAccountOptionsWorker),
    // takeLeading ignores repeat submits while a post is in flight, so a double-click can't record the payment twice
    takeLeading(RECEIPT_ACTIONS.RECORD_AR_PAYMENT, recordArPaymentWorker),
    takeLatest([RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY, RECEIPT_ACTIONS.CLEAR_PAYMENT_HISTORY], loadPaymentHistoryWorker),
    takeLatest([RECEIPT_ACTIONS.LOAD_SALES_INVOICE_PAYMENTS, RECEIPT_ACTIONS.CLEAR_SALES_INVOICE_PAYMENTS], loadSalesInvoicePaymentsWorker),
    takeLatest([RECEIPT_ACTIONS.FIND_SALES_INVOICE_AR, RECEIPT_ACTIONS.CLEAR_SALES_INVOICE_AR], findSalesInvoiceArWorker),
  ])
}
