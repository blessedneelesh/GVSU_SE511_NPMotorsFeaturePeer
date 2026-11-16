import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { receiptsApi } from '../../services/receipts/receipts.api'
import { BANK_ACCOUNT_OPTIONS_FALLBACK_MESSAGE, getReceiptErrorMessage, getReceiptSaveError } from '../../services/receipts/receipts.errors'
import type { ReceiptBankAccountOption } from '../../types/receipts'
import { loadReceivables, selectReceivable } from '../receivables/receivables.actions'
import { selectSelectedReceivableId } from '../receivables/receivables.selectors'
import {
  loadReceiptBankAccountOptionsFailure,
  loadReceiptBankAccountOptionsSuccess,
  type recordArPayment,
  recordArPaymentFailure,
  recordArPaymentSuccess,
} from './receipts.actions'
import { RECEIPT_ACTIONS } from './receipts.constants'

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

function* recordArPaymentWorker(action: ReturnType<typeof recordArPayment>): SagaIterator {
  try {
    yield call(receiptsApi.recordArPayment, action.payload)
    yield put(recordArPaymentSuccess())
    // The paid amount, balance and status changed: refetch the AR page, and the open invoice if it's the one paid
    yield put(loadReceivables())
    const selectedId: string | null = yield select(selectSelectedReceivableId)
    if (selectedId === action.payload.arInvoiceId) yield put(selectReceivable(selectedId))
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
  ])
}
