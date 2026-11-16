import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadReceiptBankAccountOptions,
  loadReceiptBankAccountOptionsFailure,
  loadReceiptBankAccountOptionsSuccess,
  recordArPayment,
  recordArPaymentFailure,
  recordArPaymentSuccess,
} from '../../../redux/receipts/receipts.actions'
import { RECEIPT_ACTIONS } from '../../../redux/receipts/receipts.constants'
import receiptsSaga from '../../../redux/receipts/receipts.saga'
import { loadReceivables, selectReceivable } from '../../../redux/receivables/receivables.actions'
import { selectSelectedReceivableId } from '../../../redux/receivables/receivables.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { receiptsApi } from '../../../services/receipts/receipts.api'
import { receiptBankAccountOptions, receiptFormValues } from '../../../test/fixtures/receipts'

vi.mock('../../../services/receipts/receipts.api', () => ({
  receiptsApi: { getBankAccountOptions: vi.fn(), recordArPayment: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = receiptsSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadBankAccountOptionsWorker = workerAt(0)
const recordArPaymentWorker = workerAt(1)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })

const request = { arInvoiceId: '2471', values: receiptFormValues }

describe('receiptsSaga (root)', () => {
  it('loads accounts with takeLatest and records payments with takeLeading', () => {
    const gen = receiptsSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest(RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS, loadBankAccountOptionsWorker),
      takeLeading(RECEIPT_ACTIONS.RECORD_AR_PAYMENT, recordArPaymentWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadBankAccountOptionsWorker', () => {
  const startOptions = () => {
    const gen = loadBankAccountOptionsWorker(loadReceiptBankAccountOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(receiptsApi.getBankAccountOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded accounts', () => {
    const { gen, signal } = startOptions()
    expect(gen.next(receiptBankAccountOptions).value).toStrictEqual(put(loadReceiptBankAccountOptionsSuccess(receiptBankAccountOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('falls back to the accounts message when the error has no detail', () => {
    const { gen } = startOptions()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadReceiptBankAccountOptionsFailure('Bank accounts could not be loaded. Please try again.')))
  })

  it('dispatches nothing when the request was cancelled', () => {
    const { gen } = startOptions()
    expect(gen.throw(new CanceledError()).value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('aborts the request when takeLatest cancels the worker', () => {
    const { gen, signal } = startOptions()
    expect(gen.return(undefined).value).toStrictEqual(cancelled())
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('recordArPaymentWorker', () => {
  const startRecord = () => {
    const gen = recordArPaymentWorker(recordArPayment(request))
    expect(gen.next().value).toStrictEqual(call(receiptsApi.recordArPayment, request))
    return gen
  }

  it('refetches the AR list and the open invoice when it is the one paid', () => {
    const gen = startRecord()
    expect(gen.next().value).toStrictEqual(put(recordArPaymentSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadReceivables()))
    expect(gen.next().value).toStrictEqual(select(selectSelectedReceivableId))
    expect(gen.next('2471').value).toStrictEqual(put(selectReceivable('2471')))
    expect(gen.next().done).toBe(true)
  })

  it('only refetches the list when no invoice, or another one, is open', () => {
    for (const selectedId of [null, '3975']) {
      const gen = startRecord()
      gen.next()
      gen.next()
      expect(gen.next().value).toStrictEqual(select(selectSelectedReceivableId))
      expect(gen.next(selectedId).done).toBe(true)
    }
  })

  it('puts field errors next to their fields', () => {
    const gen = startRecord()
    const error = httpError(400, { errors: { '$.amount': ['The JSON value could not be converted to System.Decimal.'] } })
    expect(gen.throw(error).value).toStrictEqual(put(recordArPaymentFailure({
      message: '',
      fieldErrors: { amount: 'The JSON value could not be converted to System.Decimal.' },
    })))
  })

  it('shows a business rule rejection as the banner message', () => {
    const gen = startRecord()
    expect(gen.throw(httpError(400, { title: 'Payment exceeds the outstanding balance.' })).value)
      .toStrictEqual(put(recordArPaymentFailure({ message: 'Payment exceeds the outstanding balance.', fieldErrors: {} })))
  })

  it('says the invoice no longer exists on a 404', () => {
    const gen = startRecord()
    expect(gen.throw(httpError(404, { title: 'Not Found' })).value)
      .toStrictEqual(put(recordArPaymentFailure({ message: 'This receivable no longer exists.', fieldErrors: {} })))
  })

  it('dispatches nothing when the request was cancelled', () => {
    const gen = startRecord()
    expect(gen.throw(new CanceledError()).done).toBe(true)
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

describe('receiptsSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(receiptsApi.getBankAccountOptions).mockResolvedValue(receiptBankAccountOptions)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(receiptsSaga)
  })

  afterEach(() => {
    task.cancel()
    vi.mocked(receiptsApi.recordArPayment).mockReset()
  })

  it('records a double-clicked payment only once', async () => {
    const pending = deferred<void>()
    vi.mocked(receiptsApi.recordArPayment).mockReturnValue(pending.promise)

    store.dispatch(recordArPayment(request))
    store.dispatch(recordArPayment(request))
    expect(receiptsApi.recordArPayment).toHaveBeenCalledTimes(1)

    pending.resolve()
    await vi.waitFor(() => expect(store.getState().receipts.saveStatus).toBe('success'))
    expect(store.getState().receivables.listStatus).toBe('loading')
  })

  it('stores the loaded accounts', async () => {
    store.dispatch(loadReceiptBankAccountOptions())

    await vi.waitFor(() => expect(store.getState().receipts.bankAccountOptionsStatus).toBe('success'))
    expect(store.getState().receipts.bankAccountOptions).toEqual(receiptBankAccountOptions)
  })

  it('stores the error when the payment is rejected', async () => {
    vi.mocked(receiptsApi.recordArPayment).mockRejectedValue(httpError(400, { title: 'Invoice is already paid.' }))

    store.dispatch(recordArPayment(request))

    await vi.waitFor(() => expect(store.getState().receipts.saveStatus).toBe('error'))
    expect(store.getState().receipts.saveError).toBe('Invoice is already paid.')
  })
})
