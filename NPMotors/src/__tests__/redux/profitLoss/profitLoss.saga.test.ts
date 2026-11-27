import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import type { UnknownAction } from 'redux'
import type { SagaIterator } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import { describe, expect, it, vi } from 'vitest'
import { loadProfitLoss, loadProfitLossFailure, loadProfitLossSuccess } from '../../../redux/profitLoss/profitLoss.actions'
import { PROFIT_LOSS_ACTIONS } from '../../../redux/profitLoss/profitLoss.constants'
import profitLossSaga from '../../../redux/profitLoss/profitLoss.saga'
import { selectProfitLossQuery } from '../../../redux/profitLoss/profitLoss.selectors'
import { reportsApi } from '../../../services/reports/reports.api'
import { monthComparison } from '../../../test/fixtures/reports'
import type { ReportQuery } from '../../../types/reports'

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
