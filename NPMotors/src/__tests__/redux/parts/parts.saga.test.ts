import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPartSelection,
  loadPartByIdFailure,
  loadPartByIdSuccess,
  loadPartReceiveOptions,
  loadPartReceiveOptionsFailure,
  loadPartReceiveOptionsSuccess,
  loadParts,
  loadPartsFailure,
  loadPartsSuccess,
  loadPartVendorOptions,
  loadPartVendorOptionsFailure,
  loadPartVendorOptionsSuccess,
  receiveParts,
  receivePartsFailure,
  receivePartsSuccess,
  selectPart,
  setPartCategoryFilter,
} from '../../../redux/parts/parts.actions'
import { PART_ACTIONS } from '../../../redux/parts/parts.constants'
import partsSaga from '../../../redux/parts/parts.saga'
import { selectPartQuery } from '../../../redux/parts/parts.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { partsApi } from '../../../services/parts/parts.api'
import {
  getPartErrorMessage,
  RECEIVE_OPTIONS_FALLBACK_MESSAGE,
  VENDOR_OPTIONS_FALLBACK_MESSAGE,
} from '../../../services/parts/parts.errors'
import {
  padsReceiveLine,
  part,
  partPage,
  partReceiveLines,
  partReceiveOptions,
  partVendorOptions,
  rotorsReceiveLine,
  sparsePart,
} from '../../../test/fixtures/parts'
import type { Part, PartPage, PartQuery, PartReceiveOptions } from '../../../types/parts'

vi.mock('../../../services/parts/parts.api', () => ({
  partsApi: { getParts: vi.fn(), getPartById: vi.fn(), receivePart: vi.fn(), getVendorOptions: vi.fn(), getReceiveOptions: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = partsSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadPartsWorker = workerAt(0)
const loadPartByIdWorker = workerAt(1)
const loadVendorOptionsWorker = workerAt(2)
const loadReceiveOptionsWorker = workerAt(3)
const receivePartsWorker = workerAt(4)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: PartQuery = { pageNumber: 2, pageSize: 10, category: 'Brakes', stock: 'low', searchTerm: 'pad' }

describe('partsSaga (root)', () => {
  it('starts the five watchers with the right patterns and effects', () => {
    const gen = partsSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([PART_ACTIONS.LOAD, PART_ACTIONS.SET_CATEGORY_FILTER, PART_ACTIONS.SET_STOCK_FILTER, PART_ACTIONS.SET_PAGE,
        PART_ACTIONS.SET_PAGE_SIZE, PART_ACTIONS.SET_SEARCH], loadPartsWorker),
      takeLatest([PART_ACTIONS.SELECT, PART_ACTIONS.CLEAR_SELECTION], loadPartByIdWorker),
      takeLatest(PART_ACTIONS.LOAD_VENDOR_OPTIONS, loadVendorOptionsWorker),
      takeLatest(PART_ACTIONS.LOAD_RECEIVE_OPTIONS, loadReceiveOptionsWorker),
      takeLeading(PART_ACTIONS.RECEIVE, receivePartsWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadPartsWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadPartsWorker(loadParts())
    expect(gen.next().value).toStrictEqual(select(selectPartQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(partsApi.getParts, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(partPage).value).toStrictEqual(put(loadPartsSuccess(partPage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails message when the request fails', () => {
    const { gen } = startLoad()
    const err = httpError(400, { errors: { PageSize: ["The value 'x' is not valid."] } })
    expect(gen.throw(err).value).toStrictEqual(put(loadPartsFailure("The value 'x' is not valid.")))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadPartsFailure(getPartErrorMessage(err))))
    expect(getPartErrorMessage(err)).toMatch(/unreachable/)
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
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

describe('loadPartByIdWorker', () => {
  const startLookup = () => {
    const gen = loadPartByIdWorker(selectPart('1'))
    const effect = gen.next().value
    expect(effect).toEqual(call(partsApi.getPartById, '1', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing for CLEAR_SELECTION, which only exists to cancel a lookup', () => {
    const gen = loadPartByIdWorker(clearPartSelection())
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the loaded part', () => {
    const { gen, signal } = startLookup()
    expect(gen.next(part).value).toStrictEqual(put(loadPartByIdSuccess(part)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the not-found message when the part is gone', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(loadPartByIdFailure('This part no longer exists.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title for other errors', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(500, { title: 'Boom' })).value).toStrictEqual(put(loadPartByIdFailure('Boom')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches nothing when the request was cancelled', () => {
    const { gen } = startLookup()
    expect(gen.throw(canceled()).value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('aborts the request when takeLatest cancels the worker', () => {
    const { gen, signal } = startLookup()
    const step = gen.return(undefined)
    expect(step.value).toStrictEqual(cancelled())
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('loadVendorOptionsWorker', () => {
  const startLoad = () => {
    const gen = loadVendorOptionsWorker(loadPartVendorOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(partsApi.getVendorOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded options', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(partVendorOptions).value).toStrictEqual(put(loadPartVendorOptionsSuccess(partVendorOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the vendor fallback message for an unexpected error', () => {
    const { gen } = startLoad()
    expect(gen.throw(new Error('boom')).value).toStrictEqual(put(loadPartVendorOptionsFailure(VENDOR_OPTIONS_FALLBACK_MESSAGE)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
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

describe('loadReceiveOptionsWorker', () => {
  const startLoad = () => {
    const gen = loadReceiveOptionsWorker(loadPartReceiveOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(partsApi.getReceiveOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded parts and bank accounts', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(partReceiveOptions).value).toStrictEqual(put(loadPartReceiveOptionsSuccess(partReceiveOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the receive-options fallback message for an unexpected error', () => {
    const { gen } = startLoad()
    expect(gen.throw(new Error('boom')).value).toStrictEqual(put(loadPartReceiveOptionsFailure(RECEIVE_OPTIONS_FALLBACK_MESSAGE)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { title: 'Bad page size' })).value)
      .toStrictEqual(put(loadPartReceiveOptionsFailure('Bad page size')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
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

describe('receivePartsWorker', () => {
  // Steps through the first UpdatePart call
  const startReceive = () => {
    const gen = receivePartsWorker(receiveParts(partReceiveLines))
    expect(gen.next().value).toStrictEqual(call(partsApi.receivePart, '1', 5))
    return gen
  }

  it('receives every line in order, dispatches success and then reloads the list', () => {
    const gen = startReceive()
    expect(gen.next().value).toStrictEqual(call(partsApi.receivePart, '3', 2))
    expect(gen.next().value).toStrictEqual(put(receivePartsSuccess(partReceiveLines)))
    expect(gen.next().value).toStrictEqual(put(loadParts()))
    expect(gen.next().done).toBe(true)
  })

  it('stops at a failed line, reports the lines saved before it and still reloads the list', () => {
    const gen = startReceive()
    expect(gen.next().value).toStrictEqual(call(partsApi.receivePart, '3', 2))
    expect(gen.throw(httpError(404)).value)
      .toStrictEqual(put(receivePartsFailure({ message: 'This part no longer exists.', received: [padsReceiveLine] })))
    expect(gen.next().value).toStrictEqual(put(loadParts()))
    expect(gen.next().done).toBe(true)
  })

  it('does not reload the list when the first line fails', () => {
    const gen = startReceive()
    const err = httpError(400, { errors: { Quantity_Received: ['The field Quantity_Received must be between 1 and 2147483647.'] } })
    expect(gen.throw(err).value).toStrictEqual(put(receivePartsFailure({
      message: 'The field Quantity_Received must be between 1 and 2147483647.',
      received: [],
    })))
    expect(gen.next().done).toBe(true)
  })

  it('reports the unreachable message when the API is down', () => {
    const gen = startReceive()
    const err = httpError(502)
    expect(gen.throw(err).value).toStrictEqual(put(receivePartsFailure({ message: getPartErrorMessage(err), received: [] })))
    expect(gen.next().done).toBe(true)
  })

  it('falls back to the receipt message for an unexpected error', () => {
    const gen = startReceive()
    expect(gen.throw(new Error('boom')).value).toStrictEqual(put(receivePartsFailure({
      message: 'The parts receipt could not be posted. Please try again.',
      received: [],
    })))
    expect(gen.next().done).toBe(true)
  })
})

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

// Lets settled promises run through the saga before asserting that nothing changed
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('partsSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(partsApi.getParts).mockResolvedValue(partPage)
    vi.mocked(partsApi.getPartById).mockResolvedValue(part)
    vi.mocked(partsApi.receivePart).mockResolvedValue(undefined)
    vi.mocked(partsApi.getVendorOptions).mockResolvedValue(partVendorOptions)
    vi.mocked(partsApi.getReceiveOptions).mockResolvedValue(partReceiveOptions)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(partsSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('ignores a second receipt while the first is still posting', async () => {
    const save = deferred<void>()
    vi.mocked(partsApi.receivePart).mockReturnValueOnce(save.promise)

    store.dispatch(receiveParts([padsReceiveLine]))
    store.dispatch(receiveParts([padsReceiveLine]))
    expect(partsApi.receivePart).toHaveBeenCalledTimes(1)

    save.resolve()
    await vi.waitFor(() => expect(store.getState().parts.saveStatus).toBe('success'))
    expect(partsApi.receivePart).toHaveBeenCalledTimes(1)
  })

  it('receives each line and reloads the list', async () => {
    store.dispatch(receiveParts(partReceiveLines))

    await vi.waitFor(() => expect(store.getState().parts.listStatus).toBe('success'))
    expect(store.getState().parts.saveStatus).toBe('success')
    expect(store.getState().parts.receivedLines).toEqual(partReceiveLines)
    expect(vi.mocked(partsApi.receivePart).mock.calls).toEqual([['1', 5], ['3', 2]])
    expect(partsApi.getParts).toHaveBeenCalledTimes(1)
  })

  it('keeps the lines received before a failure, so a retry only sends the rest', async () => {
    vi.mocked(partsApi.receivePart).mockResolvedValueOnce(undefined).mockRejectedValueOnce(httpError(500, { title: 'Server error' }))

    store.dispatch(receiveParts(partReceiveLines))
    await vi.waitFor(() => expect(store.getState().parts.saveStatus).toBe('error'))
    expect(store.getState().parts.saveError).toBe('Server error')
    expect(store.getState().parts.receivedLines).toEqual([padsReceiveLine])

    store.dispatch(receiveParts([rotorsReceiveLine]))
    await vi.waitFor(() => expect(store.getState().parts.saveStatus).toBe('success'))
    expect(store.getState().parts.receivedLines).toEqual(partReceiveLines)
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<PartPage>()
    const second = deferred<PartPage>()
    vi.mocked(partsApi.getParts).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setPartCategoryFilter('Brakes'))
    store.dispatch(setPartCategoryFilter('Filters'))
    const firstSignal = vi.mocked(partsApi.getParts).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)
    expect(partsApi.getParts).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Filters', pageNumber: 1 }), expect.any(AbortSignal))

    second.resolve({ items: [sparsePart], hasNext: false })
    await vi.waitFor(() => expect(store.getState().parts.listStatus).toBe('success'))
    first.resolve({ items: [part], hasNext: true })
    await flush()

    expect(store.getState().parts.items).toEqual([sparsePart])
    expect(store.getState().parts.query.category).toBe('Filters')
  })

  it('cancels the detail lookup when the detail view is closed', async () => {
    const lookup = deferred<Part>()
    vi.mocked(partsApi.getPartById).mockReturnValue(lookup.promise)

    store.dispatch(selectPart('1'))
    store.dispatch(clearPartSelection())
    expect(vi.mocked(partsApi.getPartById).mock.calls[0]?.[1]?.aborted).toBe(true)

    lookup.resolve(part)
    await flush()
    expect(store.getState().parts.selected).toBeNull()
    expect(store.getState().parts.detailStatus).toBe('idle')
  })

  it('restarts the receive-options lookup when it is requested again', async () => {
    const first = deferred<PartReceiveOptions>()
    vi.mocked(partsApi.getReceiveOptions).mockReturnValueOnce(first.promise)

    store.dispatch(loadPartReceiveOptions())
    store.dispatch(loadPartReceiveOptions())
    expect(vi.mocked(partsApi.getReceiveOptions).mock.calls[0]?.[0]?.aborted).toBe(true)

    await vi.waitFor(() => expect(store.getState().parts.receiveOptionsStatus).toBe('success'))
    first.resolve({ parts: [sparsePart], bankAccounts: [] })
    await flush()
    expect(store.getState().parts.receiveOptions).toEqual(partReceiveOptions)
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(partsApi.getParts).mockRejectedValue(httpError(400, { title: 'Bad request' }))

    store.dispatch(loadParts())

    await vi.waitFor(() => expect(store.getState().parts.listStatus).toBe('error'))
    expect(store.getState().parts.listError).toBe('Bad request')
  })

  it('leaves the other slices untouched', async () => {
    store.dispatch(loadParts())
    await vi.waitFor(() => expect(store.getState().parts.listStatus).toBe('success'))
    expect(store.getState().customers.listStatus).toBe('idle')
    expect(store.getState().vendors.listStatus).toBe('idle')
    expect(store.getState().employees.listStatus).toBe('idle')
    expect(store.getState().vehicles.listStatus).toBe('idle')
  })
})
