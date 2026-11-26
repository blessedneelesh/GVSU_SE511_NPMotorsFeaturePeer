import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { payablesApi } from '../../services/payables/payables.api'
import {
  getPayableDetailErrorMessage,
  getPayableErrorMessage,
  getPaymentHistoryErrorMessage,
  getMiscellaneousPaymentSaveError,
  getVendorPaymentSaveError,
  VENDOR_BILLS_FALLBACK_MESSAGE,
  VENDOR_OPTIONS_FALLBACK_MESSAGE,
} from '../../services/payables/payables.errors'
import { loadReceiptBankAccountOptions } from '../receipts/receipts.actions'
import type { Payable, PayableDetail, PayablePage, PayablePayment, PayableQuery, PayableVendorOption } from '../../types/payables'
import {
  type clearPaymentVendorBills,
  loadPaymentVendorBills,
  loadPaymentVendorBillsFailure,
  loadPaymentVendorBillsSuccess,
  type recordMiscellaneousPayment,
  recordMiscellaneousPaymentFailure,
  recordMiscellaneousPaymentSuccess,
  type clearPayablePaymentHistory,
  type clearPayableSelection,
  loadPayablePaymentHistory,
  loadPayables,
  loadPayableByIdFailure,
  loadPayableByIdSuccess,
  loadPayablePaymentHistoryFailure,
  loadPayablePaymentHistorySuccess,
  loadPayablesFailure,
  loadPayablesSuccess,
  loadPayableVendorOptionsFailure,
  loadPayableVendorOptionsSuccess,
  type recordVendorPayment,
  recordVendorPaymentFailure,
  recordVendorPaymentSuccess,
  selectPayable,
} from './payables.actions'
import { PAYABLE_ACTIONS } from './payables.constants'
import {
  selectPayablePaymentHistoryBillId,
  selectPayableQuery,
  selectPaymentVendorBillsVendorId,
  selectSelectedPayableId,
} from './payables.selectors'

function* loadPayablesWorker(): SagaIterator {
  const query: PayableQuery = yield select(selectPayableQuery)
  const controller = new AbortController()
  try {
    const page: PayablePage = yield call(payablesApi.getPayables, query, controller.signal)
    yield put(loadPayablesSuccess(page))
  } catch (error) {
    const message = getPayableErrorMessage(error)
    if (message) yield put(loadPayablesFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type PayableDetailAction = ReturnType<typeof selectPayable> | ReturnType<typeof clearPayableSelection>

function* loadPayableByIdWorker(action: PayableDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== PAYABLE_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const payable: PayableDetail = yield call(payablesApi.getPayableById, action.payload, controller.signal)
    yield put(loadPayableByIdSuccess(payable))
  } catch (error) {
    const message = getPayableDetailErrorMessage(error)
    if (message) yield put(loadPayableByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type PaymentHistoryAction = ReturnType<typeof loadPayablePaymentHistory> | ReturnType<typeof clearPayablePaymentHistory>

function* loadPaymentHistoryWorker(action: PaymentHistoryAction): SagaIterator {
  // CLEAR_PAYMENT_HISTORY only exists so takeLatest cancels an in-flight load when the bill is closed
  if (action.type !== PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY) return
  const apBillId = action.payload
  const controller = new AbortController()
  try {
    const payments: PayablePayment[] = yield call(payablesApi.getPaymentHistory, apBillId, controller.signal)
    yield put(loadPayablePaymentHistorySuccess({ apBillId, payments }))
  } catch (error) {
    const message = getPaymentHistoryErrorMessage(error)
    if (message) yield put(loadPayablePaymentHistoryFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* recordVendorPaymentWorker(action: ReturnType<typeof recordVendorPayment>): SagaIterator {
  try {
    yield call(payablesApi.recordVendorPayment, action.payload)
    yield put(recordVendorPaymentSuccess())
    const paidBillId = action.payload.apBillId
    // The paid amount, balance and status changed: refetch the AP page, and the open bill and its history if it's the one paid
    yield put(loadPayables())
    const selectedId: string | null = yield select(selectSelectedPayableId)
    if (selectedId === paidBillId) yield put(selectPayable(selectedId))
    const historyBillId: string | null = yield select(selectPayablePaymentHistoryBillId)
    if (historyBillId === paidBillId) yield put(loadPayablePaymentHistory(paidBillId))
    // Paid from Bank Payments: the vendor's open bills and the account balances changed
    const billsVendorId: string | null = yield select(selectPaymentVendorBillsVendorId)
    if (billsVendorId) {
      yield put(loadPaymentVendorBills(billsVendorId))
      yield put(loadReceiptBankAccountOptions())
    }
  } catch (error) {
    const saveError = getVendorPaymentSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(recordVendorPaymentFailure(saveError))
  }
}

function* loadVendorOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: PayableVendorOption[] = yield call(payablesApi.getVendorOptions, controller.signal)
    yield put(loadPayableVendorOptionsSuccess(options))
  } catch (error) {
    const message = getPayableErrorMessage(error, VENDOR_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadPayableVendorOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* recordMiscellaneousPaymentWorker(action: ReturnType<typeof recordMiscellaneousPayment>): SagaIterator {
  try {
    yield call(payablesApi.recordMiscellaneousPayment, action.payload)
    yield put(recordMiscellaneousPaymentSuccess())
    // The paying account's balance changed (the accounts live in the receipts slice)
    yield put(loadReceiptBankAccountOptions())
  } catch (error) {
    const saveError = getMiscellaneousPaymentSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(recordMiscellaneousPaymentFailure(saveError))
  }
}

function* loadVendorBillsWorker(action: ReturnType<typeof loadPaymentVendorBills> | ReturnType<typeof clearPaymentVendorBills>): SagaIterator {
  // CLEAR_VENDOR_BILLS only exists so takeLatest cancels an in-flight load when the vendor is unpicked
  if (action.type !== PAYABLE_ACTIONS.LOAD_VENDOR_BILLS) return
  const vendorId = action.payload
  const controller = new AbortController()
  try {
    const bills: Payable[] = yield call(payablesApi.getVendorBills, vendorId, controller.signal)
    yield put(loadPaymentVendorBillsSuccess({ vendorId, bills }))
  } catch (error) {
    const message = getPayableErrorMessage(error, VENDOR_BILLS_FALLBACK_MESSAGE)
    if (message) yield put(loadPaymentVendorBillsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

export default function* payablesSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        PAYABLE_ACTIONS.LOAD,
        PAYABLE_ACTIONS.SET_STATUS_FILTER,
        PAYABLE_ACTIONS.SET_VENDOR_FILTER,
        PAYABLE_ACTIONS.SET_AS_OF_DATE,
        PAYABLE_ACTIONS.RESET_FILTERS,
        PAYABLE_ACTIONS.SET_PAGE,
        PAYABLE_ACTIONS.SET_PAGE_SIZE,
      ],
      loadPayablesWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([PAYABLE_ACTIONS.SELECT, PAYABLE_ACTIONS.CLEAR_SELECTION], loadPayableByIdWorker),
    takeLatest([PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY, PAYABLE_ACTIONS.CLEAR_PAYMENT_HISTORY], loadPaymentHistoryWorker),
    // takeLeading ignores repeat submits while a post is in flight, so a double-click can't pay the bill twice
    takeLeading(PAYABLE_ACTIONS.RECORD_PAYMENT, recordVendorPaymentWorker),
    takeLatest(PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS, loadVendorOptionsWorker),
    takeLeading(PAYABLE_ACTIONS.RECORD_MISC_PAYMENT, recordMiscellaneousPaymentWorker),
    takeLatest([PAYABLE_ACTIONS.LOAD_VENDOR_BILLS, PAYABLE_ACTIONS.CLEAR_VENDOR_BILLS], loadVendorBillsWorker),
  ])
}
