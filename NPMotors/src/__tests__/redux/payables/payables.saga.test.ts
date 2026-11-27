import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadReceiptBankAccountOptions } from '../../../redux/receipts/receipts.actions'
import {
  clearPayablePaymentHistory,
  clearPaymentVendorBills,
  loadPaymentVendorBills,
  loadPaymentVendorBillsFailure,
  loadPaymentVendorBillsSuccess,
  recordMiscellaneousPayment,
  recordMiscellaneousPaymentFailure,
  recordMiscellaneousPaymentSuccess,
  clearPayableSelection,
  loadPayableByIdFailure,
  loadPayableByIdSuccess,
  loadPayablePaymentHistory,
  loadPayablePaymentHistoryFailure,
  loadPayablePaymentHistorySuccess,
  loadPayables,
  loadPayablesFailure,
  loadPayablesSuccess,
  loadPayableVendorOptions,
  loadPayableVendorOptionsFailure,
  loadPayableVendorOptionsSuccess,
  recordVendorPayment,
  recordVendorPaymentFailure,
  recordVendorPaymentSuccess,
  resetPayableFilters,
  selectPayable,
  setPayableAsOfDate,
  setPayableStatusFilter,
} from '../../../redux/payables/payables.actions'
import { PAYABLE_ACTIONS } from '../../../redux/payables/payables.constants'
import payablesSaga from '../../../redux/payables/payables.saga'
import {
  selectPayablePaymentHistoryBillId,
  selectPayableQuery,
  selectPaymentVendorBillsVendorId,
  selectSelectedPayableId,
} from '../../../redux/payables/payables.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { payablesApi } from '../../../services/payables/payables.api'
import { getPayableErrorMessage } from '../../../services/payables/payables.errors'
import { overduePayable, overduePayableDetail, partialPayable, payablePage, payablePayments, payableVendorOptions, vendorPaymentFormValues } from '../../../test/fixtures/payables'
import type { PayableDetail, PayablePage, PayablePayment, PayableQuery } from '../../../types/payables'

vi.mock('../../../services/payables/payables.api', () => ({
  payablesApi: {
    getPayables: vi.fn(),
    getPayableById: vi.fn(),
    getPaymentHistory: vi.fn(),
    recordVendorPayment: vi.fn(),
    recordMiscellaneousPayment: vi.fn(),
    getVendorBills: vi.fn(),
    getVendorOptions: vi.fn(),
  },
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
const loadPayableByIdWorker = workerAt(1)
const loadPaymentHistoryWorker = workerAt(2)
const recordVendorPaymentWorker = workerAt(3)
const loadVendorOptionsWorker = workerAt(4)
const recordMiscellaneousPaymentWorker = workerAt(5)
const loadVendorBillsWorker = workerAt(6)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: PayableQuery = { pageNumber: 2, pageSize: 10, status: 'overdue', vendorId: '3', asOfDate: '' }

describe('payablesSaga (root)', () => {
  it('starts the seven watchers with the right patterns and effects', () => {
    const gen = payablesSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([PAYABLE_ACTIONS.LOAD, PAYABLE_ACTIONS.SET_STATUS_FILTER, PAYABLE_ACTIONS.SET_VENDOR_FILTER,
        PAYABLE_ACTIONS.SET_AS_OF_DATE, PAYABLE_ACTIONS.RESET_FILTERS,
        PAYABLE_ACTIONS.SET_PAGE, PAYABLE_ACTIONS.SET_PAGE_SIZE], loadPayablesWorker),
      takeLatest([PAYABLE_ACTIONS.SELECT, PAYABLE_ACTIONS.CLEAR_SELECTION], loadPayableByIdWorker),
      takeLatest([PAYABLE_ACTIONS.LOAD_PAYMENT_HISTORY, PAYABLE_ACTIONS.CLEAR_PAYMENT_HISTORY], loadPaymentHistoryWorker),
      takeLeading(PAYABLE_ACTIONS.RECORD_PAYMENT, recordVendorPaymentWorker),
      takeLatest(PAYABLE_ACTIONS.LOAD_VENDOR_OPTIONS, loadVendorOptionsWorker),
      takeLeading(PAYABLE_ACTIONS.RECORD_MISC_PAYMENT, recordMiscellaneousPaymentWorker),
      takeLatest([PAYABLE_ACTIONS.LOAD_VENDOR_BILLS, PAYABLE_ACTIONS.CLEAR_VENDOR_BILLS], loadVendorBillsWorker),
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

describe('loadPayableByIdWorker', () => {
  const startDetail = () => {
    const gen = loadPayableByIdWorker(selectPayable('4'))
    const effect = gen.next().value
    expect(effect).toEqual(call(payablesApi.getPayableById, '4', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing on CLEAR_SELECTION', () => {
    expect(loadPayableByIdWorker(clearPayableSelection()).next().done).toBe(true)
  })

  it('dispatches the loaded bill', () => {
    const { gen, signal } = startDetail()
    expect(gen.next(overduePayableDetail).value).toStrictEqual(put(loadPayableByIdSuccess(overduePayableDetail)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('says the bill no longer exists on a 404', () => {
    const { gen } = startDetail()
    expect(gen.throw(httpError(404, { title: 'Not Found', status: 404 })).value)
      .toStrictEqual(put(loadPayableByIdFailure('This bill no longer exists.')))
  })

  it('falls back to the detail message when the error has no detail', () => {
    const { gen } = startDetail()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadPayableByIdFailure('This bill could not be loaded. Please try again.')))
  })

  it('dispatches nothing when the request was cancelled', () => {
    const { gen } = startDetail()
    expect(gen.throw(canceled()).value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('aborts the request when takeLatest cancels the worker', () => {
    const { gen, signal } = startDetail()
    expect(gen.return(undefined).value).toStrictEqual(cancelled())
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('loadPaymentHistoryWorker', () => {
  const startHistory = () => {
    const gen = loadPaymentHistoryWorker(loadPayablePaymentHistory('10'))
    const effect = gen.next().value
    expect(effect).toEqual(call(payablesApi.getPaymentHistory, '10', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing on CLEAR_PAYMENT_HISTORY', () => {
    expect(loadPaymentHistoryWorker(clearPayablePaymentHistory()).next().done).toBe(true)
  })

  it('dispatches the payments tagged with their bill', () => {
    const { gen } = startHistory()
    expect(gen.next(payablePayments).value)
      .toStrictEqual(put(loadPayablePaymentHistorySuccess({ apBillId: '10', payments: payablePayments })))
  })

  it('says the bill no longer exists on a 404, and falls back to the history message', () => {
    expect(startHistory().gen.throw(httpError(404, { title: 'Not Found' })).value)
      .toStrictEqual(put(loadPayablePaymentHistoryFailure('This bill no longer exists.')))
    expect(startHistory().gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadPayablePaymentHistoryFailure('Payment history could not be loaded. Please try again.')))
  })

  it('aborts the request when takeLatest cancels the worker', () => {
    const { gen, signal } = startHistory()
    expect(gen.return(undefined).value).toStrictEqual(cancelled())
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('recordVendorPaymentWorker', () => {
  const request = { apBillId: '11', values: vendorPaymentFormValues }
  const startPost = () => {
    const gen = recordVendorPaymentWorker(recordVendorPayment(request))
    expect(gen.next().value).toEqual(call(payablesApi.recordVendorPayment, request))
    return gen
  }

  it('refetches the list, and the open bill and its history when they are the one paid', () => {
    const gen = startPost()
    expect(gen.next().value).toStrictEqual(put(recordVendorPaymentSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadPayables()))
    expect(gen.next().value).toStrictEqual(select(selectSelectedPayableId))
    expect(gen.next('11').value).toStrictEqual(put(selectPayable('11')))
    expect(gen.next().value).toStrictEqual(select(selectPayablePaymentHistoryBillId))
    expect(gen.next('11').value).toStrictEqual(put(loadPayablePaymentHistory('11')))
    expect(gen.next().value).toStrictEqual(select(selectPaymentVendorBillsVendorId))
    expect(gen.next(null).done).toBe(true)
  })

  it('refetches only the list when paid from the list', () => {
    const gen = startPost()
    gen.next()
    gen.next()
    expect(gen.next().value).toStrictEqual(select(selectSelectedPayableId))
    expect(gen.next(null).value).toStrictEqual(select(selectPayablePaymentHistoryBillId))
    expect(gen.next(null).value).toStrictEqual(select(selectPaymentVendorBillsVendorId))
    expect(gen.next(null).done).toBe(true)
  })

  it('reloads the vendor\'s open bills and the account balances when paid from Bank Payments', () => {
    const gen = startPost()
    gen.next()
    gen.next()
    gen.next()
    gen.next(null)
    expect(gen.next(null).value).toStrictEqual(select(selectPaymentVendorBillsVendorId))
    expect(gen.next('4').value).toStrictEqual(put(loadPaymentVendorBills('4')))
    expect(gen.next().value).toStrictEqual(put(loadReceiptBankAccountOptions()))
    expect(gen.next().done).toBe(true)
  })

  it('puts field errors next to their fields', () => {
    const gen = startPost()
    expect(gen.throw(httpError(400, { errors: { Amount: ['The field amount must be between 0.01 and 999999999999.99.'] } })).value)
      .toStrictEqual(put(recordVendorPaymentFailure({ message: '', fieldErrors: { amount: 'The field amount must be between 0.01 and 999999999999.99.' } })))
  })

  it('shows a business-rule rejection as the banner message', () => {
    const gen = startPost()
    expect(gen.throw(httpError(400, { message: 'Payment exceeds the bill balance.' })).value)
      .toStrictEqual(put(recordVendorPaymentFailure({ message: 'Payment exceeds the bill balance.', fieldErrors: {} })))
  })

  it('dispatches nothing when the request was cancelled', () => {
    expect(startPost().throw(canceled()).done).toBe(true)
  })
})

describe('recordMiscellaneousPaymentWorker', () => {
  const miscRequest = { payee: 'City Properties LLC', paymentCategory: 'Rent Expense', description: '', values: vendorPaymentFormValues }
  const startMisc = () => {
    const gen = recordMiscellaneousPaymentWorker(recordMiscellaneousPayment(miscRequest))
    expect(gen.next().value).toEqual(call(payablesApi.recordMiscellaneousPayment, miscRequest))
    return gen
  }

  it('marks the save done and reloads the account balances', () => {
    const gen = startMisc()
    expect(gen.next().value).toStrictEqual(put(recordMiscellaneousPaymentSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadReceiptBankAccountOptions()))
    expect(gen.next().done).toBe(true)
  })

  it('puts ProblemDetails field errors next to their fields', () => {
    const gen = startMisc()
    const error = httpError(400, { errors: { Payee: ['The Payee field is required.'], Payment_Category: ['The Payment_Category field is required.'] } })
    expect(gen.throw(error).value).toStrictEqual(put(recordMiscellaneousPaymentFailure({
      message: '',
      fieldErrors: { payee: 'The Payee field is required.', paymentCategory: 'The Payment_Category field is required.' },
    })))
  })

  it('shows a business-rule rejection as the banner message', () => {
    const gen = startMisc()
    expect(gen.throw(httpError(400, { message: 'Insufficient funds.' })).value)
      .toStrictEqual(put(recordMiscellaneousPaymentFailure({ message: 'Insufficient funds.', fieldErrors: {} })))
  })

  it('dispatches nothing when the request was cancelled', () => {
    expect(startMisc().throw(canceled()).done).toBe(true)
  })
})

describe('loadVendorBillsWorker', () => {
  const startBills = () => {
    const gen = loadVendorBillsWorker(loadPaymentVendorBills('4'))
    const effect = gen.next().value
    expect(effect).toEqual(call(payablesApi.getVendorBills, '4', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the bills with the vendor they belong to', () => {
    const { gen, signal } = startBills()
    expect(gen.next([partialPayable]).value).toStrictEqual(put(loadPaymentVendorBillsSuccess({ vendorId: '4', bills: [partialPayable] })))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('does nothing on CLEAR_VENDOR_BILLS, which only cancels the previous load', () => {
    expect(loadVendorBillsWorker(clearPaymentVendorBills()).next().done).toBe(true)
  })

  it('falls back to the bills message when the error has no detail', () => {
    const { gen } = startBills()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadPaymentVendorBillsFailure("The vendor's open bills could not be loaded. Please try again.")))
  })

  it('aborts the request when another vendor is picked', () => {
    const { gen, signal } = startBills()
    expect(gen.return(undefined).value).toStrictEqual(cancelled())
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
      pageNumber: 1, pageSize: 10, status: 'all', vendorId: 'all', asOfDate: '',
    })
  })

  it('closing the detail cancels its lookup, so a late response is ignored', async () => {
    const pending = deferred<PayableDetail>()
    vi.mocked(payablesApi.getPayableById).mockReturnValueOnce(pending.promise)

    store.dispatch(selectPayable('4'))
    store.dispatch(clearPayableSelection())
    expect(vi.mocked(payablesApi.getPayableById).mock.calls[0]?.[1]?.aborted).toBe(true)

    pending.resolve(overduePayableDetail)
    await flush()
    expect(store.getState().payables).toMatchObject({ selectedId: null, selected: null, detailStatus: 'idle' })
  })

  it('loads the selected bill', async () => {
    vi.mocked(payablesApi.getPayableById).mockResolvedValueOnce(overduePayableDetail)
    store.dispatch(selectPayable('4'))
    await vi.waitFor(() => expect(store.getState().payables.detailStatus).toBe('success'))
    expect(store.getState().payables.selected).toEqual(overduePayableDetail)
  })

  it('closing the bill cancels its history load, so a late response is ignored', async () => {
    const pending = deferred<PayablePayment[]>()
    vi.mocked(payablesApi.getPaymentHistory).mockReturnValueOnce(pending.promise)

    store.dispatch(loadPayablePaymentHistory('10'))
    store.dispatch(clearPayablePaymentHistory())
    expect(vi.mocked(payablesApi.getPaymentHistory).mock.calls[0]?.[1]?.aborted).toBe(true)

    pending.resolve(payablePayments)
    await flush()
    expect(store.getState().payables).toMatchObject({ paymentHistoryBillId: null, payments: [], paymentHistoryStatus: 'idle' })
  })

  it('posts a double-clicked payment only once', async () => {
    let resolvePost: () => void = () => {}
    vi.mocked(payablesApi.recordVendorPayment).mockReturnValueOnce(new Promise<void>((resolve) => { resolvePost = resolve }))

    store.dispatch(recordVendorPayment({ apBillId: '11', values: vendorPaymentFormValues }))
    store.dispatch(recordVendorPayment({ apBillId: '11', values: vendorPaymentFormValues }))
    expect(payablesApi.recordVendorPayment).toHaveBeenCalledTimes(1)

    resolvePost()
    await vi.waitFor(() => expect(store.getState().payables.saveStatus).toBe('success'))
    // The AP list is refetched afterwards
    expect(payablesApi.getPayables).toHaveBeenCalled()
  })

  it('stores the loaded vendor options', async () => {
    store.dispatch(loadPayableVendorOptions())
    await vi.waitFor(() => expect(store.getState().payables.vendorOptionsStatus).toBe('success'))
    expect(store.getState().payables.vendorOptions).toEqual(payableVendorOptions)
  })
})
