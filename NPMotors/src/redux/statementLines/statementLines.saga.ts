import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { statementLinesApi } from '../../services/statementLines/statementLines.api'
import { ACCOUNT_OPTIONS_FALLBACK_MESSAGE, getStatementLineErrorMessage } from '../../services/statementLines/statementLines.errors'
import type { StatementLineAccountOption, StatementLinePage, StatementLineQuery } from '../../types/statementLines'
import {
  loadStatementLineAccountOptionsFailure,
  loadStatementLineAccountOptionsSuccess,
  loadStatementLinesFailure,
  loadStatementLinesSuccess,
} from './statementLines.actions'
import { STATEMENT_LINE_ACTIONS } from './statementLines.constants'
import { selectStatementLineQuery } from './statementLines.selectors'

function* loadStatementLinesWorker(): SagaIterator {
  const query: StatementLineQuery = yield select(selectStatementLineQuery)
  const controller = new AbortController()
  try {
    const page: StatementLinePage = yield call(statementLinesApi.getStatementLines, query, controller.signal)
    yield put(loadStatementLinesSuccess(page))
  } catch (error) {
    const message = getStatementLineErrorMessage(error)
    if (message) yield put(loadStatementLinesFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadAccountOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: StatementLineAccountOption[] = yield call(statementLinesApi.getAccountOptions, controller.signal)
    yield put(loadStatementLineAccountOptionsSuccess(options))
  } catch (error) {
    const message = getStatementLineErrorMessage(error, ACCOUNT_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadStatementLineAccountOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

export default function* statementLinesSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        STATEMENT_LINE_ACTIONS.LOAD,
        STATEMENT_LINE_ACTIONS.SET_BANK_ACCOUNT_FILTER,
        STATEMENT_LINE_ACTIONS.SET_MONTH_FILTER,
        STATEMENT_LINE_ACTIONS.SET_TYPE_FILTER,
        STATEMENT_LINE_ACTIONS.RESET_FILTERS,
        STATEMENT_LINE_ACTIONS.SET_PAGE,
        STATEMENT_LINE_ACTIONS.SET_PAGE_SIZE,
      ],
      loadStatementLinesWorker,
    ),
    takeLatest(STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS, loadAccountOptionsWorker),
  ])
}
