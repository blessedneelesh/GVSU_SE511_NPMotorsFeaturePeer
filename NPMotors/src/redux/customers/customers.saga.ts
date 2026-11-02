import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { customersApi } from '../../services/customers/customers.api'
import { getCustomerDetailErrorMessage, getCustomerErrorMessage, getCustomerSaveError } from '../../services/customers/customers.errors'
import type { Customer, CustomerPage, CustomerQuery } from '../../types/customers'
import {
  type clearCustomerSelection,
  type createCustomer,
  createCustomerFailure,
  createCustomerSuccess,
  loadCustomerByIdFailure,
  loadCustomerByIdSuccess,
  loadCustomers,
  loadCustomersFailure,
  loadCustomersSuccess,
  type selectCustomer,
} from './customers.actions'
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

type CustomerDetailAction = ReturnType<typeof selectCustomer> | ReturnType<typeof clearCustomerSelection>

function* loadCustomerByIdWorker(action: CustomerDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== CUSTOMER_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const customer: Customer = yield call(customersApi.getCustomerById, action.payload, controller.signal)
    yield put(loadCustomerByIdSuccess(customer))
  } catch (error) {
    const message = getCustomerDetailErrorMessage(error)
    if (message) yield put(loadCustomerByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* createCustomerWorker(action: ReturnType<typeof createCustomer>): SagaIterator {
  try {
    yield call(customersApi.addCustomer, action.payload)
    yield put(createCustomerSuccess())
    // Paging is server-side, so refetch the current page instead of inserting the row locally
    yield put(loadCustomers())
  } catch (error) {
    const saveError = getCustomerSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(createCustomerFailure(saveError))
  }
}

export default function* customersSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        CUSTOMER_ACTIONS.LOAD,
        CUSTOMER_ACTIONS.SET_STATUS_FILTER,
        CUSTOMER_ACTIONS.SET_PAGE,
        CUSTOMER_ACTIONS.SET_PAGE_SIZE,
        CUSTOMER_ACTIONS.SET_SEARCH,
      ],
      loadCustomersWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([CUSTOMER_ACTIONS.SELECT, CUSTOMER_ACTIONS.CLEAR_SELECTION], loadCustomerByIdWorker),
    // takeLeading ignores repeat submits while a save is in flight, so a double-click can't add the customer twice
    takeLeading(CUSTOMER_ACTIONS.CREATE, createCustomerWorker),
  ])
}
