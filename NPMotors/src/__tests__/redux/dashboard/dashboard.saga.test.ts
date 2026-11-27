import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import type { UnknownAction } from 'redux'
import type { SagaIterator } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import { describe, expect, it, vi } from 'vitest'
import { loadDashboard, loadDashboardFailure, loadDashboardSuccess } from '../../../redux/dashboard/dashboard.actions'
import { DASHBOARD_ACTIONS } from '../../../redux/dashboard/dashboard.constants'
import dashboardSaga from '../../../redux/dashboard/dashboard.saga'
import { selectDashboardQuery } from '../../../redux/dashboard/dashboard.selectors'
import { dashboardApi } from '../../../services/dashboard/dashboard.api'
import { summary } from '../../../test/fixtures/dashboard'
import type { DashboardQuery } from '../../../types/dashboard'

vi.mock('../../../services/dashboard/dashboard.api', () => ({
  dashboardApi: { getDashboardSummary: vi.fn() },
}))

// The worker isn't exported; take it from the watcher in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = dashboardSaga().next().value as { payload: ForkEffect[] }
const loadDashboardWorker = rootEffect.payload[0]!.payload.args[1]

const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })

const query: DashboardQuery = { month: '2026-10' }

const startLoad = () => {
  const gen = loadDashboardWorker(loadDashboard())
  expect(gen.next().value).toStrictEqual(select(selectDashboardQuery))
  const effect = gen.next(query).value
  expect(effect).toEqual(call(dashboardApi.getDashboardSummary, query, expect.any(AbortSignal)))
  return { gen, signal: effect.payload.args[1] as AbortSignal }
}

describe('dashboardSaga', () => {
  it('reloads on LOAD and on a month change, cancelling the previous request', () => {
    const gen = dashboardSaga()
    expect(gen.next().value).toStrictEqual(all([takeLatest([DASHBOARD_ACTIONS.LOAD, DASHBOARD_ACTIONS.SET_MONTH], loadDashboardWorker)]))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the summary', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(summary).value).toStrictEqual(put(loadDashboardSuccess(summary)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the validation message for a rejected date', () => {
    const { gen } = startLoad()
    const error = httpError(400, { title: 'One or more validation errors occurred.', errors: { As_Of_Date: ["The value 'bad' is not valid."] } })
    expect(gen.throw(error).value).toStrictEqual(put(loadDashboardFailure("The value 'bad' is not valid.")))
  })

  it('reports an unreachable API', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(502)).value).toStrictEqual(put(loadDashboardFailure('Dashboard service is unreachable. Is the API running on https://localhost:7003?')))
  })

  it('stays quiet for a cancelled request', () => {
    const { gen } = startLoad()
    expect(gen.throw(new CanceledError()).value).toStrictEqual(cancelled())
  })

  it('aborts the request when cancelled by a newer load', () => {
    const { gen, signal } = startLoad()
    expect(gen.return(undefined).value).toStrictEqual(cancelled())
    gen.next(true)
    expect(signal.aborted).toBe(true)
  })
})
