import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { transactionsApi } from '../../services/transactions/transactions.api'
import {
  ACCOUNT_OPTIONS_FALLBACK_MESSAGE,
  getTransactionDetailErrorMessage,
  getTransactionErrorMessage,
} from '../../services/transactions/transactions.errors'
import type { Transaction, TransactionAccountOption, TransactionPage, TransactionQuery } from '../../types/transactions'
import {
  type clearTransactionSelection,
  loadTransactionAccountOptionsFailure,
  loadTransactionAccountOptionsSuccess,
  loadTransactionByIdFailure,
  loadTransactionByIdSuccess,
  loadTransactionsFailure,
  loadTransactionsSuccess,
  type selectTransaction,
} from './transactions.actions'
import { TRANSACTION_ACTIONS } from './transactions.constants'
import { selectTransactionQuery } from './transactions.selectors'

function* loadTransactionsWorker(): SagaIterator {
  const query: TransactionQuery = yield select(selectTransactionQuery)
  const controller = new AbortController()
  try {
    const page: TransactionPage = yield call(transactionsApi.getTransactions, query, controller.signal)
    yield put(loadTransactionsSuccess(page))
  } catch (error) {
    const message = getTransactionErrorMessage(error)
    if (message) yield put(loadTransactionsFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type TransactionDetailAction = ReturnType<typeof selectTransaction> | ReturnType<typeof clearTransactionSelection>

function* loadTransactionByIdWorker(action: TransactionDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== TRANSACTION_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const transaction: Transaction = yield call(transactionsApi.getTransactionById, action.payload, controller.signal)
    yield put(loadTransactionByIdSuccess(transaction))
  } catch (error) {
    const message = getTransactionDetailErrorMessage(error)
    if (message) yield put(loadTransactionByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadAccountOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: TransactionAccountOption[] = yield call(transactionsApi.getAccountOptions, controller.signal)
    yield put(loadTransactionAccountOptionsSuccess(options))
  } catch (error) {
    const message = getTransactionErrorMessage(error, ACCOUNT_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadTransactionAccountOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

export default function* transactionsSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        TRANSACTION_ACTIONS.LOAD,
        TRANSACTION_ACTIONS.SET_BANK_ACCOUNT_FILTER,
        TRANSACTION_ACTIONS.SET_DIRECTION_FILTER,
        TRANSACTION_ACTIONS.SET_DATE_FROM,
        TRANSACTION_ACTIONS.SET_DATE_TO,
        TRANSACTION_ACTIONS.RESET_FILTERS,
        TRANSACTION_ACTIONS.SET_PAGE,
        TRANSACTION_ACTIONS.SET_PAGE_SIZE,
      ],
      loadTransactionsWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([TRANSACTION_ACTIONS.SELECT, TRANSACTION_ACTIONS.CLEAR_SELECTION], loadTransactionByIdWorker),
    takeLatest(TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS, loadAccountOptionsWorker),
  ])
}
