import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { reportsApi } from '../../services/reports/reports.api'
import { getReportErrorMessage } from '../../services/reports/reports.errors'
import type { PeriodComparison, ReportQuery } from '../../types/reports'
import { loadProfitLossFailure, loadProfitLossSuccess } from './profitLoss.actions'
import { PROFIT_LOSS_ACTIONS } from './profitLoss.constants'
import { selectProfitLossQuery } from './profitLoss.selectors'

// One ComparePeriods call returns both periods' full P&L, revenue, COGS and expense breakdowns included
function* loadProfitLossWorker(): SagaIterator {
  const query: ReportQuery = yield select(selectProfitLossQuery)
  const controller = new AbortController()
  try {
    const comparison: PeriodComparison = yield call(reportsApi.comparePeriods, query, controller.signal)
    yield put(loadProfitLossSuccess(comparison))
  } catch (error) {
    const message = getReportErrorMessage(error)
    if (message) yield put(loadProfitLossFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

export default function* profitLossSaga(): SagaIterator {
  yield all([
    takeLatest([PROFIT_LOSS_ACTIONS.LOAD, PROFIT_LOSS_ACTIONS.SET_PERIOD_TYPE, PROFIT_LOSS_ACTIONS.SET_ANCHOR_MONTH], loadProfitLossWorker),
  ])
}
