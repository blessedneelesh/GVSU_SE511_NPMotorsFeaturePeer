import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { receivablesApi } from '../../services/receivables/receivables.api'
import { CUSTOMER_OPTIONS_FALLBACK_MESSAGE, getReceivableErrorMessage } from '../../services/receivables/receivables.errors'
import type { ReceivableCustomerOption, ReceivablePage, ReceivableQuery } from '../../types/receivables'
import {
  loadReceivableCustomerOptionsFailure,
  loadReceivableCustomerOptionsSuccess,
  loadReceivablesFailure,
  loadReceivablesSuccess,
} from './receivables.actions'
import { RECEIVABLE_ACTIONS } from './receivables.constants'
import { selectReceivableQuery } from './receivables.selectors'

function* loadReceivablesWorker(): SagaIterator {
  const query: ReceivableQuery = yield select(selectReceivableQuery)
  const controller = new AbortController()
  try {
    const page: ReceivablePage = yield call(receivablesApi.getReceivables, query, controller.signal)
    yield put(loadReceivablesSuccess(page))
  } catch (error) {
    const message = getReceivableErrorMessage(error)
    if (message) yield put(loadReceivablesFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadCustomerOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: ReceivableCustomerOption[] = yield call(receivablesApi.getCustomerOptions, controller.signal)
    yield put(loadReceivableCustomerOptionsSuccess(options))
  } catch (error) {
    const message = getReceivableErrorMessage(error, CUSTOMER_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadReceivableCustomerOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

export default function* receivablesSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        RECEIVABLE_ACTIONS.LOAD,
        RECEIVABLE_ACTIONS.SET_STATUS_FILTER,
        RECEIVABLE_ACTIONS.SET_CUSTOMER_FILTER,
        RECEIVABLE_ACTIONS.SET_AS_OF_DATE,
        RECEIVABLE_ACTIONS.RESET_FILTERS,
        RECEIVABLE_ACTIONS.SET_PAGE,
        RECEIVABLE_ACTIONS.SET_PAGE_SIZE,
      ],
      loadReceivablesWorker,
    ),
    takeLatest(RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS, loadCustomerOptionsWorker),
  ])
}
