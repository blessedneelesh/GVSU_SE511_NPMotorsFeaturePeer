import { all, fork } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import customersSaga from './customers/customers.saga'
import vendorsSaga from './vendors/vendors.saga'

export default function* rootSaga(): SagaIterator {
  yield all([fork(customersSaga), fork(vendorsSaga)])
}
