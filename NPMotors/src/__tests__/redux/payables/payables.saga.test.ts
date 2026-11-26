import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadPayables,
  loadPayablesFailure,
  loadPayablesSuccess,
  loadPayableVendorOptions,
  loadPayableVendorOptionsFailure,
  loadPayableVendorOptionsSuccess,
  resetPayableFilters,
  setPayableAsOfDate,
  setPayableStatusFilter,
} from '../../../redux/payables/payables.actions'
import { PAYABLE_ACTIONS } from '../../../redux/payables/payables.constants'
import payablesSaga from '../../../redux/payables/payables.saga'
import { selectPayableQuery } from '../../../redux/payables/payables.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { payablesApi } from '../../../services/payables/payables.api'
import { getPayableErrorMessage } from '../../../services/payables/payables.errors'
import { overduePayable, partialPayable, payablePage, payableVendorOptions } from '../../../test/fixtures/payables'
import type { PayablePage, PayableQuery } from '../../../types/payables'

vi.mock('../../../services/payables/payables.api', () => ({
  payablesApi: { getPayables: vi.fn(), getVendorOptions: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = payablesSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadPayablesWorker = workerAt(0)
const loadVendorOptionsWorker = workerAt(1)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: PayableQuery = { pageNumber: 2, pageSize: 10, status: 'overdue', vendorId: '3', asOfDate: '' }

describe('payablesSaga (root)', () => {
  it('starts the two watchers with the right patterns and effects', () => {
    const gen = payablesSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([PAYABLE_ACTIONS.LOAD, PAYABLE_ACTIONS.SET_STATUS_FILTER, PAYABLE_ACTIONS.SET_VENDOR_FILTER,
        PAYABLE_ACTIONS.SET_AS_OF_DATE, PAYABLE_ACTIONS.RESET_FILTERS,
        PAYABLE_ACTIONS.SET_PAGE, PAYABLE_ACTIONS.SET_PAGE_SIZE], loadPayablesWorker),
      takeLatest(PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS, loadVendorOptionsWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadPayablesWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadPayablesWorker(loadPayables())
    expect(gen.next().value).toStrictEqual(select(selectPayableQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(payablesApi.getPayables, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(payablePage).value).toStrictEqual(put(loadPayablesSuccess(payablePage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the API\'s message when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { errors: ['Status must be unpaid, partial or overdue.'] })).value)
      .toStrictEqual(put(loadPayablesFailure('Status must be unpaid, partial or overdue.')))
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadPayablesFailure(getPayableErrorMessage(err))))
    expect(getPayableErrorMessage(err)).toMatch(/unreachable/)
  })

  it('dispatches nothing when the request was cancelled', () => {
    const { gen } = startLoad()
    expect(gen.throw(canceled()).value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('aborts the request when takeLatest cancels the worker', () => {
    const { gen, signal } = startLoad()
    const step = gen.return(undefined)
    expect(step.value).toStrictEqual(cancelled())
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('loadVendorOptionsWorker', () => {
  const startOptions = () => {
    const gen = loadVendorOptionsWorker(loadPayableVendorOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(payablesApi.getVendorOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded vendors', () => {
    const { gen } = startOptions()
    expect(gen.next(payableVendorOptions).value).toStrictEqual(put(loadPayableVendorOptionsSuccess(payableVendorOptions)))
  })

  it('falls back to the vendors message when the error has no detail', () => {
    const { gen } = startOptions()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadPayableVendorOptionsFailure('Vendors could not be loaded. Please try again.')))
  })

  it('aborts the request when takeLatest cancels the worker', () => {
    const { gen, signal } = startOptions()
    expect(gen.return(undefined).value).toStrictEqual(cancelled())
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => { resolve = res })
  return { promise, resolve }
}

// Lets settled promises run through the saga before asserting that nothing changed
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('payablesSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(payablesApi.getPayables).mockResolvedValue(payablePage)
    vi.mocked(payablesApi.getVendorOptions).mockResolvedValue(payableVendorOptions)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(payablesSaga)
  })

  afterEach(() => {
    task.cancel()
    vi.mocked(payablesApi.getPayables).mockReset()
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<PayablePage>()
    const second = deferred<PayablePage>()
    vi.mocked(payablesApi.getPayables).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setPayableStatusFilter('overdue'))
    store.dispatch(setPayableStatusFilter('partial'))
    expect(vi.mocked(payablesApi.getPayables).mock.calls[0]?.[1]?.aborted).toBe(true)

    second.resolve({ items: [partialPayable], hasNext: false })
    await vi.waitFor(() => expect(store.getState().payables.listStatus).toBe('success'))
    first.resolve({ items: [overduePayable], hasNext: true })
    await flush()

    expect(store.getState().payables.items).toEqual([partialPayable])
    expect(store.getState().payables.query.status).toBe('partial')
  })

  it('reloads page 1 with every filter cleared', async () => {
    store.dispatch(setPayableAsOfDate('2024-04-01'))
    await vi.waitFor(() => expect(store.getState().payables.listStatus).toBe('success'))

    store.dispatch(resetPayableFilters())
    await vi.waitFor(() => expect(payablesApi.getPayables).toHaveBeenCalledTimes(2))
    expect(vi.mocked(payablesApi.getPayables).mock.calls[1]?.[0]).toEqual({
      pageNumber: 1, pageSize: 5, status: 'all', vendorId: 'all', asOfDate: '',
    })
  })

  it('stores the loaded vendor options', async () => {
    store.dispatch(loadPayableVendorOptions())
    await vi.waitFor(() => expect(store.getState().payables.vendorOptionsStatus).toBe('success'))
    expect(store.getState().payables.vendorOptions).toEqual(payableVendorOptions)
  })
})
