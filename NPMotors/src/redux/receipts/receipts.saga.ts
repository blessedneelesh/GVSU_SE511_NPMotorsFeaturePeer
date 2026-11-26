import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { receiptsApi } from '../../services/receipts/receipts.api'
import {
  BANK_ACCOUNT_OPTIONS_FALLBACK_MESSAGE,
  CUSTOMER_INVOICES_FALLBACK_MESSAGE,
  getReceiptErrorMessage,
  getReceiptSaveError,
  MISC_RECEIPT_FALLBACK_MESSAGE,
  PAYMENT_HISTORY_FALLBACK_MESSAGE,
} from '../../services/receipts/receipts.errors'
import type { ReceiptBankAccountOption, ReceiptPayment } from '../../types/receipts'
import { loadReceivables, selectReceivable } from '../receivables/receivables.actions'
import { selectSelectedReceivableId } from '../receivables/receivables.selectors'
import { loadSalesInvoices, selectSalesInvoice } from '../salesInvoices/salesInvoices.actions'
import { selectSelectedSalesInvoice } from '../salesInvoices/salesInvoices.selectors'
import type { SalesInvoice } from '../../types/salesInvoices'
import type { Receivable } from '../../types/receivables'
import {
  type clearPaymentHistory,
  type clearReceiptCustomerInvoices,
  loadReceiptBankAccountOptions,
  loadReceiptCustomerInvoices,
  loadReceiptCustomerInvoicesFailure,
  loadReceiptCustomerInvoicesSuccess,
  type recordMiscReceipt,
  recordMiscReceiptFailure,
  recordMiscReceiptSuccess,
  loadPaymentHistory,
  loadPaymentHistoryFailure,
  loadPaymentHistorySuccess,
  loadReceiptBankAccountOptionsFailure,
  loadReceiptBankAccountOptionsSuccess,
  type recordArPayment,
  recordArPaymentFailure,
  recordArPaymentSuccess,
} from './receipts.actions'
import { RECEIPT_ACTIONS } from './receipts.constants'
import { selectReceiptCustomerInvoicesCustomerId, selectReceiptPaymentHistoryInvoiceId } from './receipts.selectors'

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

function* recordArPaymentWorker(action: ReturnType<typeof recordArPayment>): SagaIterator {
  try {
    yield call(receiptsApi.recordArPayment, action.payload)
    yield put(recordArPaymentSuccess())
    const paidArInvoiceId = action.payload.arInvoiceId
    // The paid amount, balance and status changed: refetch the AR page, and the open AR invoice if it's the one paid
    yield put(loadReceivables())
    const selectedId: string | null = yield select(selectSelectedReceivableId)
    if (selectedId === paidArInvoiceId) yield put(selectReceivable(selectedId))
    // Its payment history too, wherever it's showing (the AR invoice, or the sales invoice's Payment History tab)
    const historyInvoiceId: string | null = yield select(selectReceiptPaymentHistoryInvoiceId)
    if (historyInvoiceId === paidArInvoiceId) yield put(loadPaymentHistory(paidArInvoiceId))
    // Paid from the open sales invoice: reload it, and the sales invoice list, so the paid amount, balance and status update
    const salesInvoice: SalesInvoice | null = yield select(selectSelectedSalesInvoice)
    if (salesInvoice?.id && salesInvoice.arInvoiceId === paidArInvoiceId) {
      yield put(loadSalesInvoices())
      yield put(selectSalesInvoice(salesInvoice.id))
    }
    // Paid from Bank Receipts: the customer's open invoices and the account balances changed
    const invoicesCustomerId: string | null = yield select(selectReceiptCustomerInvoicesCustomerId)
    if (invoicesCustomerId) {
      yield put(loadReceiptCustomerInvoices(invoicesCustomerId))
      yield put(loadReceiptBankAccountOptions())
    }
  } catch (error) {
    const saveError = getReceiptSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(recordArPaymentFailure(saveError))
  }
}

function* recordMiscReceiptWorker(action: ReturnType<typeof recordMiscReceipt>): SagaIterator {
  try {
    yield call(receiptsApi.recordMiscReceipt, action.payload)
    yield put(recordMiscReceiptSuccess())
    // The deposit account's balance changed
    yield put(loadReceiptBankAccountOptions())
  } catch (error) {
    const saveError = getReceiptSaveError(error, MISC_RECEIPT_FALLBACK_MESSAGE)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(recordMiscReceiptFailure(saveError))
  }
}

function* loadCustomerInvoicesWorker(action: ReturnType<typeof loadReceiptCustomerInvoices> | ReturnType<typeof clearReceiptCustomerInvoices>): SagaIterator {
  // CLEAR_CUSTOMER_INVOICES only exists so takeLatest cancels an in-flight load when the customer is unpicked
  if (action.type !== RECEIPT_ACTIONS.LOAD_CUSTOMER_INVOICES) return
  const customerId = action.payload
  const controller = new AbortController()
  try {
    const invoices: Receivable[] = yield call(receiptsApi.getCustomerInvoices, customerId, controller.signal)
    yield put(loadReceiptCustomerInvoicesSuccess({ customerId, invoices }))
  } catch (error) {
    const message = getReceiptErrorMessage(error, CUSTOMER_INVOICES_FALLBACK_MESSAGE)
    if (message) yield put(loadReceiptCustomerInvoicesFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

export default function* receiptsSaga(): SagaIterator {
  yield all([
    takeLatest(RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS, loadBankAccountOptionsWorker),
    // takeLeading ignores repeat submits while a post is in flight, so a double-click can't record the payment twice
    takeLeading(RECEIPT_ACTIONS.RECORD_AR_PAYMENT, recordArPaymentWorker),
    takeLatest([RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY, RECEIPT_ACTIONS.CLEAR_PAYMENT_HISTORY], loadPaymentHistoryWorker),
    takeLeading(RECEIPT_ACTIONS.RECORD_MISC_RECEIPT, recordMiscReceiptWorker),
    takeLatest([RECEIPT_ACTIONS.LOAD_CUSTOMER_INVOICES, RECEIPT_ACTIONS.CLEAR_CUSTOMER_INVOICES], loadCustomerInvoicesWorker),
  ])
}
