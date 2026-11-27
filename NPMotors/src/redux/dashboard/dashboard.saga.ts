import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { dashboardApi } from '../../services/dashboard/dashboard.api'
import { getDashboardErrorMessage } from '../../services/dashboard/dashboard.errors'
import type { DashboardQuery, DashboardSummary } from '../../types/dashboard'
import { loadDashboardFailure, loadDashboardSuccess } from './dashboard.actions'
import { DASHBOARD_ACTIONS } from './dashboard.constants'
import { selectDashboardQuery } from './dashboard.selectors'

// One GetSummary call returns every card, the revenue trend, the inventory breakdown and the recent invoices
function* loadDashboardWorker(): SagaIterator {
  const query: DashboardQuery = yield select(selectDashboardQuery)
  const controller = new AbortController()
  try {
    const summary: DashboardSummary = yield call(dashboardApi.getDashboardSummary, query, controller.signal)
    yield put(loadDashboardSuccess(summary))
  } catch (error) {
    const message = getDashboardErrorMessage(error)
    if (message) yield put(loadDashboardFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

export default function* dashboardSaga(): SagaIterator {
  yield all([
    takeLatest([DASHBOARD_ACTIONS.LOAD, DASHBOARD_ACTIONS.SET_MONTH], loadDashboardWorker),
  ])
}
