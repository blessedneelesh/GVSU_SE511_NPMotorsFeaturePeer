import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { payablesApi } from '../../services/payables/payables.api'
import { getPayableErrorMessage, VENDOR_OPTIONS_FALLBACK_MESSAGE } from '../../services/payables/payables.errors'
import type { PayablePage, PayableQuery, PayableVendorOption } from '../../types/payables'
import {
  loadPayablesFailure,
  loadPayablesSuccess,
  loadPayableVendorOptionsFailure,
  loadPayableVendorOptionsSuccess,
} from './payables.actions'
import { PAYABLE_ACTIONS } from './payables.constants'
import { selectPayableQuery } from './payables.selectors'

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
    takeLatest(PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS, loadVendorOptionsWorker),
  ])
}
