import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearVendorSelection,
  createVendor,
  createVendorFailure,
  createVendorSuccess,
  loadVendorByIdFailure,
  loadVendorByIdSuccess,
  loadVendors,
  loadVendorsFailure,
  loadVendorsSuccess,
  selectVendor,
  setVendorTypeFilter,
} from '../../../redux/vendors/vendors.actions'
import { VENDOR_ACTIONS } from '../../../redux/vendors/vendors.constants'
import vendorsSaga from '../../../redux/vendors/vendors.saga'
import { selectVendorQuery } from '../../../redux/vendors/vendors.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { vendorsApi } from '../../../services/vendors/vendors.api'
import { getVendorErrorMessage, getVendorSaveError } from '../../../services/vendors/vendors.errors'
import { sparseVendor, vendor, vendorFormValues, vendorPage } from '../../../test/fixtures/vendors'
import type { Vendor, VendorPage, VendorQuery } from '../../../types/vendors'

vi.mock('../../../services/vendors/vendors.api', () => ({
  vendorsApi: { getVendors: vi.fn(), getVendorById: vi.fn(), addVendor: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = vendorsSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadVendorsWorker = workerAt(0)
const loadVendorByIdWorker = workerAt(1)
const createVendorWorker = workerAt(2)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: VendorQuery = { pageNumber: 2, pageSize: 10, type: 'parts', searchTerm: 'detroit' }

describe('vendorsSaga (root)', () => {
  it('starts the three watchers with the right patterns and effects', () => {
    const gen = vendorsSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([VENDOR_ACTIONS.LOAD, VENDOR_ACTIONS.SET_TYPE_FILTER, VENDOR_ACTIONS.SET_PAGE,
        VENDOR_ACTIONS.SET_PAGE_SIZE, VENDOR_ACTIONS.SET_SEARCH], loadVendorsWorker),
      takeLatest([VENDOR_ACTIONS.SELECT, VENDOR_ACTIONS.CLEAR_SELECTION], loadVendorByIdWorker),
      takeLeading(VENDOR_ACTIONS.CREATE, createVendorWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadVendorsWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadVendorsWorker(loadVendors())
    expect(gen.next().value).toStrictEqual(select(selectVendorQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(vendorsApi.getVendors, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(vendorPage).value).toStrictEqual(put(loadVendorsSuccess(vendorPage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails message when the request fails', () => {
    const { gen } = startLoad()
    // ASP.NET's answer to an unknown Type value
    const err = httpError(400, { errors: { Type: ["The value 'bogus' is not valid."] } })
    expect(gen.throw(err).value).toStrictEqual(put(loadVendorsFailure("The value 'bogus' is not valid.")))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadVendorsFailure(getVendorErrorMessage(err))))
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

describe('loadVendorByIdWorker', () => {
  const startLookup = () => {
    const gen = loadVendorByIdWorker(selectVendor('5'))
    const effect = gen.next().value
    expect(effect).toEqual(call(vendorsApi.getVendorById, '5', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing for CLEAR_SELECTION, which only exists to cancel a lookup', () => {
    const gen = loadVendorByIdWorker(clearVendorSelection())
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the loaded vendor', () => {
    const { gen, signal } = startLookup()
    expect(gen.next(vendor).value).toStrictEqual(put(loadVendorByIdSuccess(vendor)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the not-found message when the vendor is gone', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(loadVendorByIdFailure('This vendor no longer exists.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title for other errors', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(500, { title: 'Boom' })).value).toStrictEqual(put(loadVendorByIdFailure('Boom')))
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
    expect(step.done).toBe(false)
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('createVendorWorker', () => {
  const startCreate = () => {
    const gen = createVendorWorker(createVendor(vendorFormValues))
    expect(gen.next().value).toStrictEqual(call(vendorsApi.addVendor, vendorFormValues))
    return gen
  }

  it('dispatches success and then reloads the list', () => {
    const gen = startCreate()
    expect(gen.next().value).toStrictEqual(put(createVendorSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadVendors()))
    expect(gen.next().done).toBe(true)
  })

  it('maps the 400 "Name" error to the name field with no banner message', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400, { errors: { Name: ['The Name field is required.'] } })).value)
      .toStrictEqual(put(createVendorFailure({ message: '', fieldErrors: { name: 'The Name field is required.' } })))
    expect(gen.next().done).toBe(true)
  })

  it('maps a "$.type" conversion error to the type field and drops the unmatched "vendor" key', () => {
    const gen = startCreate()
    // The real response for an unknown enum value: one JSON-path key and one key no form field matches
    const err = httpError(400, { errors: { vendor: ['The vendor field is required.'], '$.type': ['Bad vendor type'] } })
    expect(gen.throw(err).value).toStrictEqual(put(createVendorFailure({ message: '', fieldErrors: { type: 'Bad vendor type' } })))
    expect(gen.next().done).toBe(true)
  })

  it('shows a 400 that matches no field as the banner message', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400, { title: 'Invalid' })).value)
      .toStrictEqual(put(createVendorFailure({ message: 'Invalid', fieldErrors: {} })))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the save error for a server error', () => {
    const gen = startCreate()
    const err = httpError(500, { title: 'Server error' })
    expect(gen.throw(err).value).toStrictEqual(put(createVendorFailure(getVendorSaveError(err))))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches nothing when the request was cancelled', () => {
    const gen = startCreate()
    // NOTE: with no message and no field errors nothing is dispatched, so saveStatus would stay 'loading'.
    // Nothing cancels a create today (the worker passes no signal), so this is latent.
    expect(gen.throw(canceled()).done).toBe(true)
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

describe('vendorsSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(vendorsApi.getVendors).mockResolvedValue(vendorPage)
    vi.mocked(vendorsApi.getVendorById).mockResolvedValue(vendor)
    vi.mocked(vendorsApi.addVendor).mockResolvedValue(undefined)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(vendorsSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('ignores a second create while the first is still saving', async () => {
    const save = deferred<void>()
    vi.mocked(vendorsApi.addVendor).mockReturnValue(save.promise)

    store.dispatch(createVendor(vendorFormValues))
    store.dispatch(createVendor(vendorFormValues))
    expect(vendorsApi.addVendor).toHaveBeenCalledTimes(1)

    save.resolve()
    await vi.waitFor(() => expect(store.getState().vendors.saveStatus).toBe('success'))
    expect(vendorsApi.addVendor).toHaveBeenCalledTimes(1)
  })

  it('reloads the list after a successful create', async () => {
    store.dispatch(createVendor(vendorFormValues))

    await vi.waitFor(() => expect(store.getState().vendors.listStatus).toBe('success'))
    expect(store.getState().vendors.saveStatus).toBe('success')
    expect(vendorsApi.addVendor).toHaveBeenCalledWith(vendorFormValues)
    expect(vendorsApi.getVendors).toHaveBeenCalledTimes(1)
    expect(store.getState().vendors.items).toEqual(vendorPage.items)
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<VendorPage>()
    const second = deferred<VendorPage>()
    vi.mocked(vendorsApi.getVendors).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setVendorTypeFilter('vehicles'))
    store.dispatch(setVendorTypeFilter('parts'))
    const firstSignal = vi.mocked(vendorsApi.getVendors).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)
    expect(vendorsApi.getVendors).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'parts', pageNumber: 1 }), expect.any(AbortSignal))

    second.resolve({ items: [sparseVendor], hasNext: false })
    await vi.waitFor(() => expect(store.getState().vendors.listStatus).toBe('success'))
    first.resolve({ items: [vendor], hasNext: true })
    await flush()

    expect(store.getState().vendors.items).toEqual([sparseVendor])
    expect(store.getState().vendors.query.type).toBe('parts')
  })

  it('cancels the detail lookup when the detail view is closed', async () => {
    const lookup = deferred<Vendor>()
    vi.mocked(vendorsApi.getVendorById).mockReturnValue(lookup.promise)

    store.dispatch(selectVendor('5'))
    store.dispatch(clearVendorSelection())
    expect(vi.mocked(vendorsApi.getVendorById).mock.calls[0]?.[1]?.aborted).toBe(true)

    lookup.resolve(vendor)
    await flush()
    expect(store.getState().vendors.selected).toBeNull()
    expect(store.getState().vendors.detailStatus).toBe('idle')
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(vendorsApi.getVendors).mockRejectedValue(httpError(400, { title: 'Bad filter' }))

    store.dispatch(loadVendors())

    await vi.waitFor(() => expect(store.getState().vendors.listStatus).toBe('error'))
    expect(store.getState().vendors.listError).toBe('Bad filter')
  })

  it('leaves the customers slice untouched', async () => {
    store.dispatch(loadVendors())
    await vi.waitFor(() => expect(store.getState().vendors.listStatus).toBe('success'))
    expect(store.getState().customers.listStatus).toBe('idle')
  })
})
