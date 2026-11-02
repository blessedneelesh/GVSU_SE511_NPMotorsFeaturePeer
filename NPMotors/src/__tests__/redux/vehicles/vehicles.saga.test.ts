import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearVehicleSelection,
  createVehicle,
  createVehicleFailure,
  createVehicleSuccess,
  loadVehicleByIdFailure,
  loadVehicleByIdSuccess,
  loadVehicles,
  loadVehiclesFailure,
  loadVehiclesSuccess,
  loadVehicleVendorOptions,
  loadVehicleVendorOptionsFailure,
  loadVehicleVendorOptionsSuccess,
  selectVehicle,
  setVehicleStatusFilter,
} from '../../../redux/vehicles/vehicles.actions'
import { VEHICLE_ACTIONS } from '../../../redux/vehicles/vehicles.constants'
import vehiclesSaga from '../../../redux/vehicles/vehicles.saga'
import { selectVehicleQuery } from '../../../redux/vehicles/vehicles.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { vehiclesApi } from '../../../services/vehicles/vehicles.api'
import { getVehicleErrorMessage, getVehicleSaveError, VENDOR_OPTIONS_FALLBACK_MESSAGE } from '../../../services/vehicles/vehicles.errors'
import { sparseVehicle, vehicle, vehicleFormValues, vehiclePage, vehicleVendorOptions } from '../../../test/fixtures/vehicles'
import type { Vehicle, VehiclePage, VehicleQuery, VehicleVendorOption } from '../../../types/vehicles'

vi.mock('../../../services/vehicles/vehicles.api', () => ({
  vehiclesApi: { getVehicles: vi.fn(), getVehicleById: vi.fn(), getVendorOptions: vi.fn(), addVehicle: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = vehiclesSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadVehiclesWorker = workerAt(0)
const loadVehicleByIdWorker = workerAt(1)
const loadVendorOptionsWorker = workerAt(2)
const createVehicleWorker = workerAt(3)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: VehicleQuery = { pageNumber: 2, pageSize: 10, status: 'available', searchTerm: 'camry' }

describe('vehiclesSaga (root)', () => {
  it('starts the four watchers with the right patterns and effects', () => {
    const gen = vehiclesSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([VEHICLE_ACTIONS.LOAD, VEHICLE_ACTIONS.SET_STATUS_FILTER, VEHICLE_ACTIONS.SET_PAGE,
        VEHICLE_ACTIONS.SET_PAGE_SIZE, VEHICLE_ACTIONS.SET_SEARCH], loadVehiclesWorker),
      takeLatest([VEHICLE_ACTIONS.SELECT, VEHICLE_ACTIONS.CLEAR_SELECTION], loadVehicleByIdWorker),
      takeLatest(VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS, loadVendorOptionsWorker),
      takeLeading(VEHICLE_ACTIONS.CREATE, createVehicleWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadVehiclesWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadVehiclesWorker(loadVehicles())
    expect(gen.next().value).toStrictEqual(select(selectVehicleQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(vehiclesApi.getVehicles, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(vehiclePage).value).toStrictEqual(put(loadVehiclesSuccess(vehiclePage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  // GetAllVehicles answers an unsupported Status with { message } instead of ProblemDetails
  it('dispatches the message of a rejected status filter', () => {
    const { gen } = startLoad()
    const err = httpError(400, { message: "Status must be 'available' or 'reserved'." })
    expect(gen.throw(err).value).toStrictEqual(put(loadVehiclesFailure("Status must be 'available' or 'reserved'.")))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails message when the request fails', () => {
    const { gen } = startLoad()
    const err = httpError(400, { errors: { PageSize: ["The value 'x' is not valid."] } })
    expect(gen.throw(err).value).toStrictEqual(put(loadVehiclesFailure("The value 'x' is not valid.")))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadVehiclesFailure(getVehicleErrorMessage(err))))
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

describe('loadVehicleByIdWorker', () => {
  const startLookup = () => {
    const gen = loadVehicleByIdWorker(selectVehicle('2'))
    const effect = gen.next().value
    expect(effect).toEqual(call(vehiclesApi.getVehicleById, '2', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing for CLEAR_SELECTION, which only exists to cancel a lookup', () => {
    const gen = loadVehicleByIdWorker(clearVehicleSelection())
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the loaded vehicle', () => {
    const { gen, signal } = startLookup()
    expect(gen.next(vehicle).value).toStrictEqual(put(loadVehicleByIdSuccess(vehicle)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the not-found message when the vehicle is gone', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(loadVehicleByIdFailure('This vehicle no longer exists.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title for other errors', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(500, { title: 'Boom' })).value).toStrictEqual(put(loadVehicleByIdFailure('Boom')))
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

describe('loadVendorOptionsWorker', () => {
  const startLoad = () => {
    const gen = loadVendorOptionsWorker(loadVehicleVendorOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(vehiclesApi.getVendorOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded options', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(vehicleVendorOptions).value).toStrictEqual(put(loadVehicleVendorOptionsSuccess(vehicleVendorOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the vendor fallback message for an unexpected error', () => {
    const { gen } = startLoad()
    expect(gen.throw(new Error('boom')).value).toStrictEqual(put(loadVehicleVendorOptionsFailure(VENDOR_OPTIONS_FALLBACK_MESSAGE)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { title: 'Bad vendor type' })).value)
      .toStrictEqual(put(loadVehicleVendorOptionsFailure('Bad vendor type')))
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

describe('createVehicleWorker', () => {
  const startCreate = () => {
    const gen = createVehicleWorker(createVehicle(vehicleFormValues))
    expect(gen.next().value).toStrictEqual(call(vehiclesApi.addVehicle, vehicleFormValues))
    return gen
  }

  it('dispatches success and then reloads the list', () => {
    const gen = startCreate()
    expect(gen.next().value).toStrictEqual(put(createVehicleSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadVehicles()))
    expect(gen.next().done).toBe(true)
  })

  it('maps the 400 keys to their form fields with no banner message', () => {
    const gen = startCreate()
    const err = httpError(400, { errors: {
      Vin: ['The Vin field is required.'],
      Purchase_Price: ['Purchase price must be greater than 0.'],
      Vendor_Id: ['The Vendor_Id field is required.'],
    } })
    expect(gen.throw(err).value).toStrictEqual(put(createVehicleFailure({
      message: '',
      fieldErrors: {
        vin: 'The Vin field is required.',
        purchasePrice: 'Purchase price must be greater than 0.',
        vendorId: 'The Vendor_Id field is required.',
      },
    })))
    expect(gen.next().done).toBe(true)
  })

  it('maps a "$.purchase_Price" conversion error to the purchase price field and drops a key no field matches', () => {
    const gen = startCreate()
    const err = httpError(400, { errors: { dto: ['The dto field is required.'], '$.purchase_Price': ['Not a number'] } })
    expect(gen.throw(err).value).toStrictEqual(put(createVehicleFailure({ message: '', fieldErrors: { purchasePrice: 'Not a number' } })))
    expect(gen.next().done).toBe(true)
  })

  it('shows a 400 that matches no field as the banner message', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400, { title: 'Invalid' })).value)
      .toStrictEqual(put(createVehicleFailure({ message: 'Invalid', fieldErrors: {} })))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the save error for a server error', () => {
    const gen = startCreate()
    const err = httpError(500, { title: 'Server error' })
    expect(gen.throw(err).value).toStrictEqual(put(createVehicleFailure(getVehicleSaveError(err))))
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

describe('vehiclesSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(vehiclesApi.getVehicles).mockResolvedValue(vehiclePage)
    vi.mocked(vehiclesApi.getVehicleById).mockResolvedValue(vehicle)
    vi.mocked(vehiclesApi.getVendorOptions).mockResolvedValue(vehicleVendorOptions)
    vi.mocked(vehiclesApi.addVehicle).mockResolvedValue(undefined)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(vehiclesSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('ignores a second create while the first is still saving', async () => {
    const save = deferred<void>()
    vi.mocked(vehiclesApi.addVehicle).mockReturnValue(save.promise)

    store.dispatch(createVehicle(vehicleFormValues))
    store.dispatch(createVehicle(vehicleFormValues))
    expect(vehiclesApi.addVehicle).toHaveBeenCalledTimes(1)

    save.resolve()
    await vi.waitFor(() => expect(store.getState().vehicles.saveStatus).toBe('success'))
    expect(vehiclesApi.addVehicle).toHaveBeenCalledTimes(1)
  })

  it('reloads the list after a successful create', async () => {
    store.dispatch(createVehicle(vehicleFormValues))

    await vi.waitFor(() => expect(store.getState().vehicles.listStatus).toBe('success'))
    expect(store.getState().vehicles.saveStatus).toBe('success')
    expect(vehiclesApi.addVehicle).toHaveBeenCalledWith(vehicleFormValues)
    expect(vehiclesApi.getVehicles).toHaveBeenCalledTimes(1)
    expect(store.getState().vehicles.items).toEqual(vehiclePage.items)
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<VehiclePage>()
    const second = deferred<VehiclePage>()
    vi.mocked(vehiclesApi.getVehicles).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setVehicleStatusFilter('available'))
    store.dispatch(setVehicleStatusFilter('reserved'))
    const firstSignal = vi.mocked(vehiclesApi.getVehicles).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)
    expect(vehiclesApi.getVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'reserved', pageNumber: 1 }), expect.any(AbortSignal))

    second.resolve({ items: [sparseVehicle], hasNext: false })
    await vi.waitFor(() => expect(store.getState().vehicles.listStatus).toBe('success'))
    first.resolve({ items: [vehicle], hasNext: true })
    await flush()

    expect(store.getState().vehicles.items).toEqual([sparseVehicle])
    expect(store.getState().vehicles.query.status).toBe('reserved')
  })

  it('cancels the detail lookup when the detail view is closed', async () => {
    const lookup = deferred<Vehicle>()
    vi.mocked(vehiclesApi.getVehicleById).mockReturnValue(lookup.promise)

    store.dispatch(selectVehicle('2'))
    store.dispatch(clearVehicleSelection())
    expect(vi.mocked(vehiclesApi.getVehicleById).mock.calls[0]?.[1]?.aborted).toBe(true)

    lookup.resolve(vehicle)
    await flush()
    expect(store.getState().vehicles.selected).toBeNull()
    expect(store.getState().vehicles.detailStatus).toBe('idle')
  })

  it('restarts the vendor lookup when it is requested again', async () => {
    const first = deferred<VehicleVendorOption[]>()
    vi.mocked(vehiclesApi.getVendorOptions).mockReturnValueOnce(first.promise)

    store.dispatch(loadVehicleVendorOptions())
    store.dispatch(loadVehicleVendorOptions())
    expect(vi.mocked(vehiclesApi.getVendorOptions).mock.calls[0]?.[0]?.aborted).toBe(true)

    await vi.waitFor(() => expect(store.getState().vehicles.vendorOptionsStatus).toBe('success'))
    first.resolve([{ id: '9', name: 'Stale Vendor' }])
    await flush()
    expect(store.getState().vehicles.vendorOptions).toEqual(vehicleVendorOptions)
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(vehiclesApi.getVehicles).mockRejectedValue(httpError(400, { message: "Status must be 'available' or 'reserved'." }))

    store.dispatch(loadVehicles())

    await vi.waitFor(() => expect(store.getState().vehicles.listStatus).toBe('error'))
    expect(store.getState().vehicles.listError).toBe("Status must be 'available' or 'reserved'.")
  })

  it('leaves the customers, vendors and employees slices untouched', async () => {
    store.dispatch(loadVehicles())
    await vi.waitFor(() => expect(store.getState().vehicles.listStatus).toBe('success'))
    expect(store.getState().customers.listStatus).toBe('idle')
    expect(store.getState().vendors.listStatus).toBe('idle')
    expect(store.getState().employees.listStatus).toBe('idle')
  })
})
