import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadProfitLoss, loadProfitLossFailure, loadProfitLossSuccess, setProfitLossAnchorMonth, setProfitLossPeriodType } from '../../../redux/profitLoss/profitLoss.actions'
import { PROFIT_LOSS_ACTIONS } from '../../../redux/profitLoss/profitLoss.constants'
import profitLossSaga from '../../../redux/profitLoss/profitLoss.saga'
import { selectProfitLossQuery } from '../../../redux/profitLoss/profitLoss.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { reportsApi } from '../../../services/reports/reports.api'
import { monthComparison } from '../../../test/fixtures/reports'
import type { PeriodComparison, ReportQuery } from '../../../types/reports'

vi.mock('../../../services/reports/reports.api', () => ({
  reportsApi: { comparePeriods: vi.fn() },
}))

// The worker isn't exported; take it from the watcher in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = profitLossSaga().next().value as { payload: ForkEffect[] }
const loadProfitLossWorker = rootEffect.payload[0]!.payload.args[1]

const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })

const query: ReportQuery = { periodType: 'Quarter', anchorMonth: '2026-11' }

const startLoad = () => {
  const gen = loadProfitLossWorker(loadProfitLoss())
  expect(gen.next().value).toStrictEqual(select(selectProfitLossQuery))
  const effect = gen.next(query).value
  expect(effect).toEqual(call(reportsApi.comparePeriods, query, expect.any(AbortSignal)))
  return { gen, signal: effect.payload.args[1] as AbortSignal }
}

describe('profitLossSaga', () => {
  it('reloads on LOAD and on every query change, cancelling the previous request', () => {
    const gen = profitLossSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([PROFIT_LOSS_ACTIONS.LOAD, PROFIT_LOSS_ACTIONS.SET_PERIOD_TYPE, PROFIT_LOSS_ACTIONS.SET_ANCHOR_MONTH], loadProfitLossWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the comparison', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(monthComparison).value).toStrictEqual(put(loadProfitLossSuccess(monthComparison)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the validation message when the API rejects the query', () => {
    const { gen } = startLoad()
    const error = httpError(400, { title: 'One or more validation errors occurred.', errors: { Period_Type: ['Period_Type must be Month, Quarter or YearToDate.'] } })
    expect(gen.throw(error).value).toStrictEqual(put(loadProfitLossFailure('Period_Type must be Month, Quarter or YearToDate.')))
  })

  it('reports an unreachable API', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(502)).value).toStrictEqual(put(loadProfitLossFailure('Report service is unreachable. Is the API running on https://localhost:7003?')))
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

interface Deferred<T> { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('profitLossSaga with a real store', () => {
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>
  let task: Task

  beforeEach(() => {
    vi.mocked(reportsApi.comparePeriods).mockReset()
    vi.mocked(reportsApi.comparePeriods).mockResolvedValue(monthComparison)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(profitLossSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('loads the comparison for the current query', async () => {
    store.dispatch(setProfitLossAnchorMonth('2026-11'))
    await vi.waitFor(() => expect(store.getState().profitLoss.status).toBe('success'))
    expect(store.getState().profitLoss.comparison).toEqual(monthComparison)
    expect(vi.mocked(reportsApi.comparePeriods).mock.calls[0]?.[0]).toEqual({ periodType: 'Month', anchorMonth: '2026-11' })
  })

  it('keeps only the latest response and aborts the stale request', async () => {
    const first = deferred<PeriodComparison>()
    const second = deferred<PeriodComparison>()
    vi.mocked(reportsApi.comparePeriods).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setProfitLossPeriodType('Quarter'))
    store.dispatch(setProfitLossPeriodType('YearToDate'))
    const firstSignal = vi.mocked(reportsApi.comparePeriods).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)
    expect(vi.mocked(reportsApi.comparePeriods).mock.calls[1]?.[0].periodType).toBe('YearToDate')

    const latest = { ...monthComparison, netProfitChangePct: 1 }
    second.resolve(latest)
    await vi.waitFor(() => expect(store.getState().profitLoss.status).toBe('success'))
    first.resolve(monthComparison)
    await flush()

    expect(store.getState().profitLoss.comparison).toEqual(latest)
    expect(store.getState().profitLoss.query.periodType).toBe('YearToDate')
  })

  it('stores the error and recovers on retry', async () => {
    vi.mocked(reportsApi.comparePeriods).mockRejectedValueOnce(httpError(502))
    store.dispatch(loadProfitLoss())
    await vi.waitFor(() => expect(store.getState().profitLoss.status).toBe('error'))
    expect(store.getState().profitLoss.error).toBe('Report service is unreachable. Is the API running on https://localhost:7003?')

    store.dispatch(loadProfitLoss())
    await vi.waitFor(() => expect(store.getState().profitLoss.status).toBe('success'))
    expect(store.getState().profitLoss.error).toBeNull()
  })
})
