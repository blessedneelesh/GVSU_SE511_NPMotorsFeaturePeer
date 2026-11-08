import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rootReducer } from '../../../redux/rootReducer'
import {
  cancelSalesInvoice,
  cancelSalesInvoiceFailure,
  cancelSalesInvoiceSuccess,
  clearSalesInvoiceSelection,
  createSalesInvoice,
  loadSalesInvoiceByIdFailure,
  loadSalesInvoiceByIdSuccess,
  loadSalesInvoiceOptions,
  loadSalesInvoiceOptionsFailure,
  loadSalesInvoiceOptionsSuccess,
  loadSalesInvoices,
  loadSalesInvoicesFailure,
  loadSalesInvoicesSuccess,
  postSalesInvoice,
  saveSalesInvoiceFailure,
  saveSalesInvoiceSuccess,
  selectSalesInvoice,
  setSalesInvoiceStatusFilter,
} from '../../../redux/salesInvoices/salesInvoices.actions'
import { SALES_INVOICE_ACTIONS } from '../../../redux/salesInvoices/salesInvoices.constants'
import salesInvoicesSaga from '../../../redux/salesInvoices/salesInvoices.saga'
import { selectSalesInvoiceQuery, selectSelectedSalesInvoiceId } from '../../../redux/salesInvoices/salesInvoices.selectors'
import { salesInvoicesApi } from '../../../services/salesInvoices/salesInvoices.api'
import { getSalesInvoiceErrorMessage, OPTIONS_FALLBACK_MESSAGE } from '../../../services/salesInvoices/salesInvoices.errors'
import {
  cancelledInvoice,
  draftInvoice,
  postedInvoice,
  salesInvoiceFormValues,
  salesInvoiceOptions,
  salesInvoicePage,
} from '../../../test/fixtures/salesInvoices'
import type { SalesInvoice, SalesInvoiceOptions, SalesInvoicePage, SalesInvoiceQuery } from '../../../types/salesInvoices'

vi.mock('../../../services/salesInvoices/salesInvoices.api', () => ({
  salesInvoicesApi: {
    getSalesInvoices: vi.fn(),
    getSalesInvoiceById: vi.fn(),
    addSalesInvoice: vi.fn(),
    postSalesInvoice: vi.fn(),
    cancelSalesInvoice: vi.fn(),
    getOptions: vi.fn(),
  },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = salesInvoicesSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadSalesInvoicesWorker = workerAt(0)
const loadSalesInvoiceByIdWorker = workerAt(1)
const loadOptionsWorker = workerAt(2)
const saveSalesInvoiceWorker = workerAt(3)
const cancelSalesInvoiceWorker = workerAt(4)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: SalesInvoiceQuery = { pageNumber: 2, pageSize: 10, status: 'unpaid', fromDate: '2026-10-01', toDate: '', searchTerm: 'INV' }
const cancelRequest = { id: '6', reason: 'Customer financing fell through' }

describe('salesInvoicesSaga (root)', () => {
  it('starts the five watchers with the right patterns and effects', () => {
    const gen = salesInvoicesSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([SALES_INVOICE_ACTIONS.LOAD, SALES_INVOICE_ACTIONS.SET_STATUS_FILTER, SALES_INVOICE_ACTIONS.SET_FROM_DATE,
        SALES_INVOICE_ACTIONS.SET_TO_DATE, SALES_INVOICE_ACTIONS.SET_PAGE, SALES_INVOICE_ACTIONS.SET_PAGE_SIZE,
        SALES_INVOICE_ACTIONS.SET_SEARCH], loadSalesInvoicesWorker),
      takeLatest([SALES_INVOICE_ACTIONS.SELECT, SALES_INVOICE_ACTIONS.CLEAR_SELECTION], loadSalesInvoiceByIdWorker),
      takeLatest(SALES_INVOICE_ACTIONS.LOAD_OPTIONS, loadOptionsWorker),
      takeLeading([SALES_INVOICE_ACTIONS.CREATE, SALES_INVOICE_ACTIONS.POST], saveSalesInvoiceWorker),
      takeLeading(SALES_INVOICE_ACTIONS.CANCEL, cancelSalesInvoiceWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadSalesInvoicesWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadSalesInvoicesWorker(loadSalesInvoices())
    expect(gen.next().value).toStrictEqual(select(selectSalesInvoiceQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(salesInvoicesApi.getSalesInvoices, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(salesInvoicePage).value).toStrictEqual(put(loadSalesInvoicesSuccess(salesInvoicePage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails message when the request fails', () => {
    const { gen } = startLoad()
    const err = httpError(400, { errors: { FromDate: ["The value 'x' is not valid."] } })
    expect(gen.throw(err).value).toStrictEqual(put(loadSalesInvoicesFailure("The value 'x' is not valid.")))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadSalesInvoicesFailure(getSalesInvoiceErrorMessage(err))))
    expect(getSalesInvoiceErrorMessage(err)).toMatch(/unreachable/)
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

describe('loadSalesInvoiceByIdWorker', () => {
  const startLookup = () => {
    const gen = loadSalesInvoiceByIdWorker(selectSalesInvoice('6'))
    const effect = gen.next().value
    expect(effect).toEqual(call(salesInvoicesApi.getSalesInvoiceById, '6', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing for CLEAR_SELECTION, which only exists to cancel a lookup', () => {
    const gen = loadSalesInvoiceByIdWorker(clearSalesInvoiceSelection())
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the loaded invoice', () => {
    const { gen, signal } = startLookup()
    expect(gen.next(postedInvoice).value).toStrictEqual(put(loadSalesInvoiceByIdSuccess(postedInvoice)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the not-found message when the invoice is gone', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(loadSalesInvoiceByIdFailure('This sales invoice no longer exists.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title for other errors', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(500, { title: 'Boom' })).value).toStrictEqual(put(loadSalesInvoiceByIdFailure('Boom')))
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

describe('loadOptionsWorker', () => {
  const startLoad = () => {
    const gen = loadOptionsWorker(loadSalesInvoiceOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(salesInvoicesApi.getOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded options', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(salesInvoiceOptions).value).toStrictEqual(put(loadSalesInvoiceOptionsSuccess(salesInvoiceOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the options fallback message for an unexpected error', () => {
    const { gen } = startLoad()
    expect(gen.throw(new Error('boom')).value).toStrictEqual(put(loadSalesInvoiceOptionsFailure(OPTIONS_FALLBACK_MESSAGE)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { title: 'Bad page size' })).value)
      .toStrictEqual(put(loadSalesInvoiceOptionsFailure('Bad page size')))
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

describe('saveSalesInvoiceWorker', () => {
  it.each([
    ['Save Draft', createSalesInvoice(salesInvoiceFormValues), salesInvoicesApi.addSalesInvoice],
    ['Post Invoice', postSalesInvoice(salesInvoiceFormValues), salesInvoicesApi.postSalesInvoice],
  ] as const)('%s calls its endpoint, dispatches success and then reloads the list', (_, action, endpoint) => {
    const gen = saveSalesInvoiceWorker(action)
    expect(gen.next().value).toStrictEqual(call(endpoint, salesInvoiceFormValues))
    expect(gen.next().value).toStrictEqual(put(saveSalesInvoiceSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadSalesInvoices()))
    expect(gen.next().done).toBe(true)
  })

  const startSave = () => {
    const gen = saveSalesInvoiceWorker(createSalesInvoice(salesInvoiceFormValues))
    gen.next()
    return gen
  }

  it('puts validation errors on their fields with no banner message', () => {
    const gen = startSave()
    const err = httpError(400, { errors: { Discount: ['The field Discount must be between 0 and 999999999999.99.'] } })
    expect(gen.throw(err).value).toStrictEqual(put(saveSalesInvoiceFailure({
      message: '',
      fieldErrors: { discount: 'The field Discount must be between 0 and 999999999999.99.' },
    })))
    expect(gen.next().done).toBe(true)
  })

  it('shows a business-rule { message } in the banner', () => {
    const gen = startSave()
    expect(gen.throw(httpError(400, { message: 'Customer does not exist.' })).value)
      .toStrictEqual(put(saveSalesInvoiceFailure({ message: 'Customer does not exist.', fieldErrors: {} })))
    expect(gen.next().done).toBe(true)
  })

  it('reports the unreachable message when the API is down', () => {
    const gen = startSave()
    const err = httpError(502)
    expect(gen.throw(err).value).toStrictEqual(put(saveSalesInvoiceFailure({ message: getSalesInvoiceErrorMessage(err), fieldErrors: {} })))
    expect(gen.next().done).toBe(true)
  })

  it('falls back to the save message for an unexpected error', () => {
    const gen = startSave()
    expect(gen.throw(new Error('boom')).value).toStrictEqual(put(saveSalesInvoiceFailure({
      message: 'The sales invoice could not be saved. Please try again.',
      fieldErrors: {},
    })))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches nothing when the request was cancelled', () => {
    const gen = startSave()
    expect(gen.throw(canceled()).done).toBe(true)
  })
})

describe('cancelSalesInvoiceWorker', () => {
  const startCancel = () => {
    const gen = cancelSalesInvoiceWorker(cancelSalesInvoice(cancelRequest))
    expect(gen.next().value).toStrictEqual(call(salesInvoicesApi.cancelSalesInvoice, cancelRequest))
    return gen
  }

  it('dispatches success, reloads the list and reloads the open detail view', () => {
    const gen = startCancel()
    expect(gen.next().value).toStrictEqual(put(cancelSalesInvoiceSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadSalesInvoices()))
    expect(gen.next().value).toStrictEqual(select(selectSelectedSalesInvoiceId))
    expect(gen.next('6').value).toStrictEqual(put(selectSalesInvoice('6')))
    expect(gen.next().done).toBe(true)
  })

  it('does not open a detail view when cancelling from the list', () => {
    const gen = startCancel()
    gen.next()
    gen.next()
    expect(gen.next().value).toStrictEqual(select(selectSelectedSalesInvoiceId))
    expect(gen.next(null).done).toBe(true)
  })

  it('dispatches the not-found message when the invoice is gone', () => {
    const gen = startCancel()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(cancelSalesInvoiceFailure('This sales invoice no longer exists.')))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the business-rule message, e.g. for a paid invoice', () => {
    const gen = startCancel()
    expect(gen.throw(httpError(400, { message: 'Only unpaid posted invoices can be cancelled.' })).value)
      .toStrictEqual(put(cancelSalesInvoiceFailure('Only unpaid posted invoices can be cancelled.')))
    expect(gen.next().done).toBe(true)
  })

  it('falls back to the cancel message for an unexpected error', () => {
    const gen = startCancel()
    expect(gen.throw(new Error('boom')).value)
      .toStrictEqual(put(cancelSalesInvoiceFailure('The sales invoice could not be cancelled. Please try again.')))
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

describe('salesInvoicesSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(salesInvoicesApi.getSalesInvoices).mockResolvedValue(salesInvoicePage)
    vi.mocked(salesInvoicesApi.getSalesInvoiceById).mockResolvedValue(postedInvoice)
    vi.mocked(salesInvoicesApi.addSalesInvoice).mockResolvedValue(undefined)
    vi.mocked(salesInvoicesApi.postSalesInvoice).mockResolvedValue(undefined)
    vi.mocked(salesInvoicesApi.cancelSalesInvoice).mockResolvedValue(undefined)
    vi.mocked(salesInvoicesApi.getOptions).mockResolvedValue(salesInvoiceOptions)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(salesInvoicesSaga)
  })

  afterEach(() => {
    task.cancel()
    vi.clearAllMocks()
  })

  it('saves once when Save Draft and Post Invoice are both clicked while the first save is in flight', async () => {
    const save = deferred<undefined>()
    vi.mocked(salesInvoicesApi.addSalesInvoice).mockReturnValueOnce(save.promise)

    store.dispatch(createSalesInvoice(salesInvoiceFormValues))
    store.dispatch(createSalesInvoice(salesInvoiceFormValues))
    store.dispatch(postSalesInvoice(salesInvoiceFormValues))
    expect(salesInvoicesApi.addSalesInvoice).toHaveBeenCalledTimes(1)

    save.resolve(undefined)
    await vi.waitFor(() => expect(store.getState().salesInvoices.saveStatus).toBe('success'))
    expect(salesInvoicesApi.addSalesInvoice).toHaveBeenCalledTimes(1)
    expect(salesInvoicesApi.postSalesInvoice).not.toHaveBeenCalled()
    expect(store.getState().salesInvoices.saveMode).toBe('draft')
  })

  it('posts the invoice and reloads the list', async () => {
    store.dispatch(postSalesInvoice(salesInvoiceFormValues))

    await vi.waitFor(() => expect(store.getState().salesInvoices.listStatus).toBe('success'))
    expect(store.getState().salesInvoices.saveStatus).toBe('success')
    expect(store.getState().salesInvoices.saveMode).toBe('post')
    expect(salesInvoicesApi.postSalesInvoice).toHaveBeenCalledWith(salesInvoiceFormValues)
    expect(salesInvoicesApi.getSalesInvoices).toHaveBeenCalledTimes(1)
  })

  it('stores the field errors when the save is rejected', async () => {
    vi.mocked(salesInvoicesApi.addSalesInvoice).mockRejectedValue(httpError(400, { errors: { Tax: ['Tax is out of range.'] } }))

    store.dispatch(createSalesInvoice(salesInvoiceFormValues))

    await vi.waitFor(() => expect(store.getState().salesInvoices.saveStatus).toBe('error'))
    expect(store.getState().salesInvoices.saveError).toBeNull()
    expect(store.getState().salesInvoices.fieldErrors).toEqual({ tax: 'Tax is out of range.' })
    expect(salesInvoicesApi.getSalesInvoices).not.toHaveBeenCalled()
  })

  it('ignores a second cancel while the first is still in flight', async () => {
    const request = deferred<undefined>()
    vi.mocked(salesInvoicesApi.cancelSalesInvoice).mockReturnValueOnce(request.promise)

    store.dispatch(cancelSalesInvoice(cancelRequest))
    store.dispatch(cancelSalesInvoice(cancelRequest))
    expect(salesInvoicesApi.cancelSalesInvoice).toHaveBeenCalledTimes(1)

    request.resolve(undefined)
    await vi.waitFor(() => expect(store.getState().salesInvoices.cancelStatus).toBe('success'))
    expect(salesInvoicesApi.cancelSalesInvoice).toHaveBeenCalledTimes(1)
  })

  it('reloads the open invoice after cancelling it from the detail view', async () => {
    store.dispatch(selectSalesInvoice('6'))
    await vi.waitFor(() => expect(store.getState().salesInvoices.detailStatus).toBe('success'))
    vi.mocked(salesInvoicesApi.getSalesInvoiceById).mockResolvedValue({ ...cancelledInvoice, id: '6' })

    store.dispatch(cancelSalesInvoice(cancelRequest))

    await vi.waitFor(() => expect(store.getState().salesInvoices.selected?.lifecycle).toBe('cancelled'))
    expect(salesInvoicesApi.getSalesInvoiceById).toHaveBeenCalledTimes(2)
    expect(salesInvoicesApi.getSalesInvoices).toHaveBeenCalledTimes(1)
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<SalesInvoicePage>()
    const second = deferred<SalesInvoicePage>()
    vi.mocked(salesInvoicesApi.getSalesInvoices).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setSalesInvoiceStatusFilter('draft'))
    store.dispatch(setSalesInvoiceStatusFilter('posted'))
    const firstSignal = vi.mocked(salesInvoicesApi.getSalesInvoices).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)
    expect(salesInvoicesApi.getSalesInvoices)
      .toHaveBeenLastCalledWith(expect.objectContaining({ status: 'posted', pageNumber: 1 }), expect.any(AbortSignal))

    second.resolve({ items: [postedInvoice], hasNext: false })
    await vi.waitFor(() => expect(store.getState().salesInvoices.listStatus).toBe('success'))
    first.resolve({ items: [draftInvoice], hasNext: true })
    await flush()

    expect(store.getState().salesInvoices.items).toEqual([postedInvoice])
    expect(store.getState().salesInvoices.query.status).toBe('posted')
  })

  it('cancels the detail lookup when the detail view is closed', async () => {
    const lookup = deferred<SalesInvoice>()
    vi.mocked(salesInvoicesApi.getSalesInvoiceById).mockReturnValue(lookup.promise)

    store.dispatch(selectSalesInvoice('6'))
    store.dispatch(clearSalesInvoiceSelection())
    expect(vi.mocked(salesInvoicesApi.getSalesInvoiceById).mock.calls[0]?.[1]?.aborted).toBe(true)

    lookup.resolve(postedInvoice)
    await flush()
    expect(store.getState().salesInvoices.selected).toBeNull()
    expect(store.getState().salesInvoices.detailStatus).toBe('idle')
  })

  it('restarts the options lookup when it is requested again', async () => {
    const first = deferred<SalesInvoiceOptions>()
    vi.mocked(salesInvoicesApi.getOptions).mockReturnValueOnce(first.promise)

    store.dispatch(loadSalesInvoiceOptions())
    store.dispatch(loadSalesInvoiceOptions())
    expect(vi.mocked(salesInvoicesApi.getOptions).mock.calls[0]?.[0]?.aborted).toBe(true)

    await vi.waitFor(() => expect(store.getState().salesInvoices.optionsStatus).toBe('success'))
    first.resolve({ customers: [], employees: [], salespeople: [], vehicles: [] })
    await flush()
    expect(store.getState().salesInvoices.options).toEqual(salesInvoiceOptions)
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(salesInvoicesApi.getSalesInvoices).mockRejectedValue(httpError(400, { title: 'Bad request' }))

    store.dispatch(loadSalesInvoices())

    await vi.waitFor(() => expect(store.getState().salesInvoices.listStatus).toBe('error'))
    expect(store.getState().salesInvoices.listError).toBe('Bad request')
  })

  it('leaves the other slices untouched', async () => {
    store.dispatch(loadSalesInvoices())
    await vi.waitFor(() => expect(store.getState().salesInvoices.listStatus).toBe('success'))
    expect(store.getState().customers.listStatus).toBe('idle')
    expect(store.getState().vendors.listStatus).toBe('idle')
    expect(store.getState().employees.listStatus).toBe('idle')
    expect(store.getState().vehicles.listStatus).toBe('idle')
    expect(store.getState().parts.listStatus).toBe('idle')
  })
})
