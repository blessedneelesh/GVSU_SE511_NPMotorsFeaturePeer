import { all, call, cancelled, put, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { transfersApi } from '../../services/transfers/transfers.api'
import { ACCOUNT_OPTIONS_FALLBACK_MESSAGE, getTransferErrorMessage, getTransferSaveError } from '../../services/transfers/transfers.errors'
import type { TransferAccountOption } from '../../types/transfers'
import {
  type createTransfer,
  createTransferFailure,
  createTransferSuccess,
  loadTransferAccountOptions,
  loadTransferAccountOptionsFailure,
  loadTransferAccountOptionsSuccess,
} from './transfers.actions'
import { TRANSFER_ACTIONS } from './transfers.constants'

function* loadAccountOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: TransferAccountOption[] = yield call(transfersApi.getAccountOptions, controller.signal)
    yield put(loadTransferAccountOptionsSuccess(options))
  } catch (error) {
    const message = getTransferErrorMessage(error, ACCOUNT_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadTransferAccountOptionsFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* createTransferWorker(action: ReturnType<typeof createTransfer>): SagaIterator {
  try {
    yield call(transfersApi.createTransfer, action.payload)
    yield put(createTransferSuccess())
    // Both balances changed, so refetch the accounts
    yield put(loadTransferAccountOptions())
  } catch (error) {
    const saveError = getTransferSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(createTransferFailure(saveError))
  }
}

export default function* transfersSaga(): SagaIterator {
  yield all([
    takeLatest(TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS, loadAccountOptionsWorker),
    // takeLeading ignores repeat submits while a post is in flight, so a double-click can't move the money twice
    takeLeading(TRANSFER_ACTIONS.CREATE, createTransferWorker),
  ])
}
