import { call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { customersApi } from '../../services/customers/customers.api'
import { getCustomerErrorMessage } from '../../services/customers/customers.errors'
import type { CustomerPage, CustomerQuery } from '../../types/customers'
import { loadCustomersFailure, loadCustomersSuccess } from './customers.actions'
import { CUSTOMER_ACTIONS } from './customers.constants'
import { selectCustomerQuery } from './customers.selectors'

function* loadCustomersWorker(): SagaIterator {
  const query: CustomerQuery = yield select(selectCustomerQuery)
  const controller = new AbortController()
  try {
    const page: CustomerPage = yield call(customersApi.getCustomers, query, controller.signal)
    yield put(loadCustomersSuccess(page))
  } catch (error) {
    const message = getCustomerErrorMessage(error)
    if (message) yield put(loadCustomersFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

export default function* customersSaga(): SagaIterator {
  yield takeLatest(
    [
      CUSTOMER_ACTIONS.LOAD,
      CUSTOMER_ACTIONS.SET_STATUS_FILTER,
      CUSTOMER_ACTIONS.SET_PAGE,
      CUSTOMER_ACTIONS.SET_PAGE_SIZE,
      CUSTOMER_ACTIONS.SET_SEARCH,
    ],
    loadCustomersWorker,
  )
}
