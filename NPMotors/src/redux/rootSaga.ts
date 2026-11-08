import { all, fork } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import customersSaga from './customers/customers.saga'
import vendorsSaga from './vendors/vendors.saga'
import employeesSaga from './employees/employees.saga'
import vehiclesSaga from './vehicles/vehicles.saga'
import partsSaga from './parts/parts.saga'
import salesInvoicesSaga from './salesInvoices/salesInvoices.saga'
import bankAccountsSaga from './bankAccounts/bankAccounts.saga'
import transactionsSaga from './transactions/transactions.saga'
import statementLinesSaga from './statementLines/statementLines.saga'

export default function* rootSaga(): SagaIterator {
  yield all([fork(customersSaga), fork(vendorsSaga), fork(employeesSaga), fork(vehiclesSaga), fork(partsSaga), fork(salesInvoicesSaga), fork(bankAccountsSaga), fork(transactionsSaga), fork(statementLinesSaga)])
}
