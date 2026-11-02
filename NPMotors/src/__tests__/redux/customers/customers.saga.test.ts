import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearCustomerSelection,
  createCustomer,
  createCustomerFailure,
  createCustomerSuccess,
  loadCustomerByIdFailure,
  loadCustomerByIdSuccess,
  loadCustomers,
  loadCustomersFailure,
  loadCustomersSuccess,
  selectCustomer,
  setCustomerStatusFilter,
} from '../../../redux/customers/customers.actions'
import { CUSTOMER_ACTIONS } from '../../../redux/customers/customers.constants'
import customersSaga from '../../../redux/customers/customers.saga'
import { selectCustomerQuery } from '../../../redux/customers/customers.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { customersApi } from '../../../services/customers/customers.api'
import { getCustomerErrorMessage, getCustomerSaveError } from '../../../services/customers/customers.errors'
import { customer, customerPage, formValues, sparseCustomer } from '../../../test/fixtures/customers'
import type { Customer, CustomerPage, CustomerQuery } from '../../../types/customers'

vi.mock('../../../services/customers/customers.api', () => ({
  customersApi: { getCustomers: vi.fn(), getCustomerById: vi.fn(), addCustomer: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = customersSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadCustomersWorker = workerAt(0)
const loadCustomerByIdWorker = workerAt(1)
const createCustomerWorker = workerAt(2)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: CustomerQuery = { pageNumber: 2, pageSize: 10, status: 'active', searchTerm: 'smith' }

describe('customersSaga (root)', () => {
  it('starts the three watchers with the right patterns and effects', () => {
    const gen = customersSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([CUSTOMER_ACTIONS.LOAD, CUSTOMER_ACTIONS.SET_STATUS_FILTER, CUSTOMER_ACTIONS.SET_PAGE,
        CUSTOMER_ACTIONS.SET_PAGE_SIZE, CUSTOMER_ACTIONS.SET_SEARCH], loadCustomersWorker),
      takeLatest([CUSTOMER_ACTIONS.SELECT, CUSTOMER_ACTIONS.CLEAR_SELECTION], loadCustomerByIdWorker),
      takeLeading(CUSTOMER_ACTIONS.CREATE, createCustomerWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadCustomersWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadCustomersWorker(loadCustomers())
    expect(gen.next().value).toStrictEqual(select(selectCustomerQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(customersApi.getCustomers, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(customerPage).value).toStrictEqual(put(loadCustomersSuccess(customerPage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { title: 'Bad filter' })).value).toStrictEqual(put(loadCustomersFailure('Bad filter')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadCustomersFailure(getCustomerErrorMessage(err))))
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

describe('loadCustomerByIdWorker', () => {
  const startLookup = () => {
    const gen = loadCustomerByIdWorker(selectCustomer('C001'))
    const effect = gen.next().value
    expect(effect).toEqual(call(customersApi.getCustomerById, 'C001', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing for CLEAR_SELECTION, which only exists to cancel a lookup', () => {
    const gen = loadCustomerByIdWorker(clearCustomerSelection())
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the loaded customer', () => {
    const { gen, signal } = startLookup()
    expect(gen.next(customer).value).toStrictEqual(put(loadCustomerByIdSuccess(customer)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the not-found message when the customer is gone', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(loadCustomerByIdFailure('This customer no longer exists.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title for other errors', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(500, { title: 'Boom' })).value).toStrictEqual(put(loadCustomerByIdFailure('Boom')))
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

describe('createCustomerWorker', () => {
  const startCreate = () => {
    const gen = createCustomerWorker(createCustomer(formValues))
    expect(gen.next().value).toStrictEqual(call(customersApi.addCustomer, formValues))
    return gen
  }

  it('dispatches success and then reloads the list', () => {
    const gen = startCreate()
    expect(gen.next().value).toStrictEqual(put(createCustomerSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadCustomers()))
    expect(gen.next().done).toBe(true)
  })

  it('maps 400 validation errors to form fields with no banner message', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400, { errors: { Email: ['Email already exists'] } })).value)
      .toStrictEqual(put(createCustomerFailure({ message: '', fieldErrors: { email: 'Email already exists' } })))
    expect(gen.next().done).toBe(true)
  })

  it('shows a 400 that matches no field as the banner message', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400, { title: 'Invalid' })).value)
      .toStrictEqual(put(createCustomerFailure({ message: 'Invalid', fieldErrors: {} })))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the save error for a server error', () => {
    const gen = startCreate()
    const err = httpError(500, { title: 'Server error' })
    expect(gen.throw(err).value).toStrictEqual(put(createCustomerFailure(getCustomerSaveError(err))))
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

describe('customersSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(customersApi.getCustomers).mockResolvedValue(customerPage)
    vi.mocked(customersApi.getCustomerById).mockResolvedValue(customer)
    vi.mocked(customersApi.addCustomer).mockResolvedValue(undefined)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(customersSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('ignores a second create while the first is still saving', async () => {
    const save = deferred<void>()
    vi.mocked(customersApi.addCustomer).mockReturnValue(save.promise)

    store.dispatch(createCustomer(formValues))
    store.dispatch(createCustomer(formValues))
    expect(customersApi.addCustomer).toHaveBeenCalledTimes(1)

    save.resolve()
    await vi.waitFor(() => expect(store.getState().customers.saveStatus).toBe('success'))
    expect(customersApi.addCustomer).toHaveBeenCalledTimes(1)
  })

  it('reloads the list after a successful create', async () => {
    store.dispatch(createCustomer(formValues))

    await vi.waitFor(() => expect(store.getState().customers.listStatus).toBe('success'))
    expect(store.getState().customers.saveStatus).toBe('success')
    expect(customersApi.addCustomer).toHaveBeenCalledWith(formValues)
    expect(customersApi.getCustomers).toHaveBeenCalledTimes(1)
    expect(store.getState().customers.items).toEqual(customerPage.items)
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<CustomerPage>()
    const second = deferred<CustomerPage>()
    vi.mocked(customersApi.getCustomers).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setCustomerStatusFilter('active'))
    store.dispatch(setCustomerStatusFilter('inactive'))
    const firstSignal = vi.mocked(customersApi.getCustomers).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)

    second.resolve({ items: [sparseCustomer], hasNext: false })
    await vi.waitFor(() => expect(store.getState().customers.listStatus).toBe('success'))
    first.resolve({ items: [customer], hasNext: true })
    await flush()

    expect(store.getState().customers.items).toEqual([sparseCustomer])
    expect(store.getState().customers.query.status).toBe('inactive')
  })

  it('cancels the detail lookup when the detail view is closed', async () => {
    const lookup = deferred<Customer>()
    vi.mocked(customersApi.getCustomerById).mockReturnValue(lookup.promise)

    store.dispatch(selectCustomer('C001'))
    store.dispatch(clearCustomerSelection())
    expect(vi.mocked(customersApi.getCustomerById).mock.calls[0]?.[1]?.aborted).toBe(true)

    lookup.resolve(customer)
    await flush()
    expect(store.getState().customers.selected).toBeNull()
    expect(store.getState().customers.detailStatus).toBe('idle')
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(customersApi.getCustomers).mockRejectedValue(httpError(400, { title: 'Bad filter' }))

    store.dispatch(loadCustomers())

    await vi.waitFor(() => expect(store.getState().customers.listStatus).toBe('error'))
    expect(store.getState().customers.listError).toBe('Bad filter')
  })
})
