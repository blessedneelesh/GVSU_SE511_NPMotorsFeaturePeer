import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadReceivableCustomerOptions,
  loadReceivableCustomerOptionsFailure,
  loadReceivableCustomerOptionsSuccess,
  loadReceivables,
  loadReceivablesFailure,
  loadReceivablesSuccess,
  resetReceivableFilters,
  setReceivableAsOfDate,
  setReceivableStatusFilter,
} from '../../../redux/receivables/receivables.actions'
import { RECEIVABLE_ACTIONS } from '../../../redux/receivables/receivables.constants'
import receivablesSaga from '../../../redux/receivables/receivables.saga'
import { selectReceivableQuery } from '../../../redux/receivables/receivables.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { receivablesApi } from '../../../services/receivables/receivables.api'
import { getReceivableErrorMessage } from '../../../services/receivables/receivables.errors'
import { overdueReceivable, partialReceivable, receivableCustomerOptions, receivablePage } from '../../../test/fixtures/receivables'
import type { ReceivablePage, ReceivableQuery } from '../../../types/receivables'

vi.mock('../../../services/receivables/receivables.api', () => ({
  receivablesApi: { getReceivables: vi.fn(), getCustomerOptions: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = receivablesSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadReceivablesWorker = workerAt(0)
const loadCustomerOptionsWorker = workerAt(1)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: ReceivableQuery = { pageNumber: 2, pageSize: 10, status: 'overdue', customerId: '7', asOfDate: '' }

describe('receivablesSaga (root)', () => {
  it('starts the two watchers with the right patterns and effects', () => {
    const gen = receivablesSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([RECEIVABLE_ACTIONS.LOAD, RECEIVABLE_ACTIONS.SET_STATUS_FILTER, RECEIVABLE_ACTIONS.SET_CUSTOMER_FILTER,
        RECEIVABLE_ACTIONS.SET_AS_OF_DATE, RECEIVABLE_ACTIONS.RESET_FILTERS,
        RECEIVABLE_ACTIONS.SET_PAGE, RECEIVABLE_ACTIONS.SET_PAGE_SIZE], loadReceivablesWorker),
      takeLatest(RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS, loadCustomerOptionsWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadReceivablesWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadReceivablesWorker(loadReceivables())
    expect(gen.next().value).toStrictEqual(select(selectReceivableQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(receivablesApi.getReceivables, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(receivablePage).value).toStrictEqual(put(loadReceivablesSuccess(receivablePage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { title: 'Bad date' })).value).toStrictEqual(put(loadReceivablesFailure('Bad date')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadReceivablesFailure(getReceivableErrorMessage(err))))
    expect(getReceivableErrorMessage(err)).toMatch(/unreachable/)
  })

  it('falls back to the receivables message when the error has no detail', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadReceivablesFailure('Receivables could not be loaded. Please try again.')))
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
    expect(step.done).toBe(false)
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('loadCustomerOptionsWorker', () => {
  const startOptions = () => {
    const gen = loadCustomerOptionsWorker(loadReceivableCustomerOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(receivablesApi.getCustomerOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded customers', () => {
    const { gen, signal } = startOptions()
    expect(gen.next(receivableCustomerOptions).value).toStrictEqual(put(loadReceivableCustomerOptionsSuccess(receivableCustomerOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('falls back to the customers message when the error has no detail', () => {
    const { gen } = startOptions()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadReceivableCustomerOptionsFailure('Customers could not be loaded. Please try again.')))
  })

  it('dispatches nothing when the request was cancelled', () => {
    const { gen } = startOptions()
    expect(gen.throw(canceled()).value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
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

describe('receivablesSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(receivablesApi.getReceivables).mockResolvedValue(receivablePage)
    vi.mocked(receivablesApi.getCustomerOptions).mockResolvedValue(receivableCustomerOptions)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(receivablesSaga)
  })

  afterEach(() => {
    task.cancel()
    vi.mocked(receivablesApi.getReceivables).mockReset()
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<ReceivablePage>()
    const second = deferred<ReceivablePage>()
    vi.mocked(receivablesApi.getReceivables).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setReceivableStatusFilter('overdue'))
    store.dispatch(setReceivableStatusFilter('partial'))
    const firstSignal = vi.mocked(receivablesApi.getReceivables).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)

    second.resolve({ items: [partialReceivable], hasNext: false })
    await vi.waitFor(() => expect(store.getState().receivables.listStatus).toBe('success'))
    first.resolve({ items: [overdueReceivable], hasNext: true })
    await flush()

    expect(store.getState().receivables.items).toEqual([partialReceivable])
    expect(store.getState().receivables.query.status).toBe('partial')
  })

  it('reloads page 1 with every filter cleared', async () => {
    store.dispatch(setReceivableAsOfDate('2024-04-01'))
    await vi.waitFor(() => expect(store.getState().receivables.listStatus).toBe('success'))

    store.dispatch(resetReceivableFilters())
    await vi.waitFor(() => expect(receivablesApi.getReceivables).toHaveBeenCalledTimes(2))
    expect(vi.mocked(receivablesApi.getReceivables).mock.calls[1]?.[0]).toEqual({
      pageNumber: 1, pageSize: 5, status: 'all', customerId: 'all', asOfDate: '',
    })
  })

  it('stores the loaded customer options', async () => {
    store.dispatch(loadReceivableCustomerOptions())

    await vi.waitFor(() => expect(store.getState().receivables.customerOptionsStatus).toBe('success'))
    expect(store.getState().receivables.customerOptions).toEqual(receivableCustomerOptions)
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(receivablesApi.getReceivables).mockRejectedValue(httpError(400, { title: 'Bad date' }))

    store.dispatch(loadReceivables())

    await vi.waitFor(() => expect(store.getState().receivables.listStatus).toBe('error'))
    expect(store.getState().receivables.listError).toBe('Bad date')
  })
})
