import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPaymentHistory,
  clearReceiptCustomerInvoices,
  loadPaymentHistory,
  loadPaymentHistoryFailure,
  loadPaymentHistorySuccess,
  loadReceiptBankAccountOptions,
  loadReceiptBankAccountOptionsFailure,
  loadReceiptBankAccountOptionsSuccess,
  loadReceiptCustomerInvoices,
  loadReceiptCustomerInvoicesFailure,
  loadReceiptCustomerInvoicesSuccess,
  recordArPayment,
  recordArPaymentFailure,
  recordArPaymentSuccess,
  recordMiscReceipt,
  recordMiscReceiptFailure,
  recordMiscReceiptSuccess,
} from '../../../redux/receipts/receipts.actions'
import { RECEIPT_ACTIONS } from '../../../redux/receipts/receipts.constants'
import receiptsSaga from '../../../redux/receipts/receipts.saga'
import { loadReceivables, selectReceivable } from '../../../redux/receivables/receivables.actions'
import { selectSelectedReceivableId } from '../../../redux/receivables/receivables.selectors'
import { selectReceiptCustomerInvoicesCustomerId, selectReceiptPaymentHistoryInvoiceId } from '../../../redux/receipts/receipts.selectors'
import { loadSalesInvoices, selectSalesInvoice } from '../../../redux/salesInvoices/salesInvoices.actions'
import { selectSelectedSalesInvoice } from '../../../redux/salesInvoices/salesInvoices.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { receiptsApi } from '../../../services/receipts/receipts.api'
import { receiptBankAccountOptions, receiptFormValues, receiptPayments } from '../../../test/fixtures/receipts'
import { receivablePage } from '../../../test/fixtures/receivables'
import { postedInvoice } from '../../../test/fixtures/salesInvoices'

vi.mock('../../../services/receipts/receipts.api', () => ({
  receiptsApi: { getBankAccountOptions: vi.fn(), recordArPayment: vi.fn(), recordMiscReceipt: vi.fn(), getCustomerInvoices: vi.fn(), getPaymentHistory: vi.fn() },
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
const loadPaymentHistoryWorker = workerAt(2)
const recordMiscReceiptWorker = workerAt(3)
const loadCustomerInvoicesWorker = workerAt(4)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })

const request = { arInvoiceId: '2471', values: receiptFormValues }

describe('receiptsSaga (root)', () => {
  it('loads with takeLatest and records receipts with takeLeading', () => {
    const gen = receiptsSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest(RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS, loadBankAccountOptionsWorker),
      takeLeading(RECEIPT_ACTIONS.RECORD_AR_PAYMENT, recordArPaymentWorker),
      takeLatest([RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY, RECEIPT_ACTIONS.CLEAR_PAYMENT_HISTORY], loadPaymentHistoryWorker),
      takeLeading(RECEIPT_ACTIONS.RECORD_MISC_RECEIPT, recordMiscReceiptWorker),
      takeLatest([RECEIPT_ACTIONS.LOAD_CUSTOMER_INVOICES, RECEIPT_ACTIONS.CLEAR_CUSTOMER_INVOICES], loadCustomerInvoicesWorker),
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

  // Steps past the success and the AR list refetch, to the check of the open AR invoice
  const toReceivableCheck = () => {
    const gen = startRecord()
    expect(gen.next().value).toStrictEqual(put(recordArPaymentSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadReceivables()))
    expect(gen.next().value).toStrictEqual(select(selectSelectedReceivableId))
    return gen
  }

  it('refetches the AR list, and the open AR invoice and its payments when it is the one paid', () => {
    const gen = toReceivableCheck()
    expect(gen.next('2471').value).toStrictEqual(put(selectReceivable('2471')))
    expect(gen.next().value).toStrictEqual(select(selectReceiptPaymentHistoryInvoiceId))
    expect(gen.next('2471').value).toStrictEqual(put(loadPaymentHistory('2471')))
    expect(gen.next().value).toStrictEqual(select(selectSelectedSalesInvoice))
    expect(gen.next(null).value).toStrictEqual(select(selectReceiptCustomerInvoicesCustomerId))
    expect(gen.next(null).done).toBe(true)
  })

  it('only refetches the list when no invoice, or another one, is open', () => {
    for (const openId of [null, '3975']) {
      const gen = toReceivableCheck()
      expect(gen.next(openId).value).toStrictEqual(select(selectReceiptPaymentHistoryInvoiceId))
      expect(gen.next(openId).value).toStrictEqual(select(selectSelectedSalesInvoice))
      expect(gen.next(null).value).toStrictEqual(select(selectReceiptCustomerInvoicesCustomerId))
      expect(gen.next(null).done).toBe(true)
    }
  })

  it('reloads the open sales invoice, and its payment history, when the payment was taken from it', () => {
    const paidInvoice = { ...postedInvoice, arInvoiceId: '2471' }
    const gen = toReceivableCheck()
    gen.next(null)
    expect(gen.next('2471').value).toStrictEqual(put(loadPaymentHistory('2471')))
    expect(gen.next().value).toStrictEqual(select(selectSelectedSalesInvoice))
    expect(gen.next(paidInvoice).value).toStrictEqual(put(loadSalesInvoices()))
    expect(gen.next().value).toStrictEqual(put(selectSalesInvoice('6')))
    expect(gen.next().value).toStrictEqual(select(selectReceiptCustomerInvoicesCustomerId))
    expect(gen.next(null).done).toBe(true)
  })

  it.each([
    ['another AR invoice', { ...postedInvoice, arInvoiceId: '9999' }],
    ['no AR invoice', { ...postedInvoice, arInvoiceId: '' }],
    ['no id', { ...postedInvoice, id: '', arInvoiceId: '2471' }],
  ])('leaves the sales invoices alone when the open one has %s', (_, salesInvoice) => {
    const gen = toReceivableCheck()
    gen.next(null)
    gen.next(null)
    expect(gen.next(salesInvoice).value).toStrictEqual(select(selectReceiptCustomerInvoicesCustomerId))
    expect(gen.next(null).done).toBe(true)
  })

  it('reloads the customer\'s open invoices and the account balances when paid from Bank Receipts', () => {
    const gen = toReceivableCheck()
    gen.next(null)
    gen.next(null)
    expect(gen.next(null).value).toStrictEqual(select(selectReceiptCustomerInvoicesCustomerId))
    expect(gen.next('5').value).toStrictEqual(put(loadReceiptCustomerInvoices('5')))
    expect(gen.next().value).toStrictEqual(put(loadReceiptBankAccountOptions()))
    expect(gen.next().done).toBe(true)
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

describe('recordMiscReceiptWorker', () => {
  const miscRequest = { payer: 'Ally Bank', description: '', values: receiptFormValues }
  const startMisc = () => {
    const gen = recordMiscReceiptWorker(recordMiscReceipt(miscRequest))
    expect(gen.next().value).toStrictEqual(call(receiptsApi.recordMiscReceipt, miscRequest))
    return gen
  }

  it('marks the save done and reloads the account balances', () => {
    const gen = startMisc()
    expect(gen.next().value).toStrictEqual(put(recordMiscReceiptSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadReceiptBankAccountOptions()))
    expect(gen.next().done).toBe(true)
  })

  it('shows the API\'s list of validation messages as the banner', () => {
    const gen = startMisc()
    const error = httpError(400, { errors: ['Payer is required. Amount must be greater than zero.'] })
    expect(gen.throw(error).value).toStrictEqual(put(recordMiscReceiptFailure({
      message: 'Payer is required. Amount must be greater than zero.',
      fieldErrors: {},
    })))
  })

  it('puts ProblemDetails field errors next to their fields', () => {
    const gen = startMisc()
    expect(gen.throw(httpError(400, { errors: { Payer: ['Too long'] } })).value)
      .toStrictEqual(put(recordMiscReceiptFailure({ message: '', fieldErrors: { payer: 'Too long' } })))
  })

  it('falls back to the receipt message', () => {
    const gen = startMisc()
    expect(gen.throw(new Error('boom')).value)
      .toStrictEqual(put(recordMiscReceiptFailure({ message: 'The receipt could not be posted. Please try again.', fieldErrors: {} })))
  })

  it('dispatches nothing when the request was cancelled', () => {
    expect(startMisc().throw(new CanceledError()).done).toBe(true)
  })
})

describe('loadCustomerInvoicesWorker', () => {
  const startInvoices = () => {
    const gen = loadCustomerInvoicesWorker(loadReceiptCustomerInvoices('5'))
    const effect = gen.next().value
    expect(effect).toEqual(call(receiptsApi.getCustomerInvoices, '5', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the invoices with the customer they belong to', () => {
    const { gen, signal } = startInvoices()
    expect(gen.next(receivablePage.items).value).toStrictEqual(put(loadReceiptCustomerInvoicesSuccess({ customerId: '5', invoices: receivablePage.items })))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('does nothing on CLEAR_CUSTOMER_INVOICES, which only cancels the previous load', () => {
    expect(loadCustomerInvoicesWorker(clearReceiptCustomerInvoices()).next().done).toBe(true)
  })

  it('falls back to the invoices message when the error has no detail', () => {
    const { gen } = startInvoices()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadReceiptCustomerInvoicesFailure("The customer's open invoices could not be loaded. Please try again.")))
  })

  it('aborts the request when another customer is picked', () => {
    const { gen, signal } = startInvoices()
    expect(gen.return(undefined).value).toStrictEqual(cancelled())
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('loadPaymentHistoryWorker', () => {
  const startHistory = () => {
    const gen = loadPaymentHistoryWorker(loadPaymentHistory('2471'))
    const effect = gen.next().value
    expect(effect).toEqual(call(receiptsApi.getPaymentHistory, '2471', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the payments with the invoice they belong to', () => {
    const { gen, signal } = startHistory()
    expect(gen.next(receiptPayments).value).toStrictEqual(put(loadPaymentHistorySuccess({ arInvoiceId: '2471', payments: receiptPayments })))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('does nothing on CLEAR_PAYMENT_HISTORY, which only cancels the previous load', () => {
    expect(loadPaymentHistoryWorker(clearPaymentHistory()).next().done).toBe(true)
  })

  it('says the invoice no longer exists on a 404', () => {
    const { gen } = startHistory()
    expect(gen.throw(httpError(404, { title: 'Not Found' })).value).toStrictEqual(put(loadPaymentHistoryFailure('This receivable no longer exists.')))
  })

  it('falls back to the history message when the error has no detail', () => {
    const { gen } = startHistory()
    expect(gen.throw(httpError(400)).value).toStrictEqual(put(loadPaymentHistoryFailure('Payment history could not be loaded. Please try again.')))
  })

  it('aborts the request when the invoice is closed or another one opened', () => {
    const { gen, signal } = startHistory()
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

    vi.mocked(receiptsApi.getPaymentHistory).mockResolvedValue([])
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

  it('shows only the last opened invoice\'s payments when an earlier load answers late', async () => {
    const first = deferred<typeof receiptPayments>()
    vi.mocked(receiptsApi.getPaymentHistory).mockReturnValueOnce(first.promise).mockResolvedValueOnce([])

    store.dispatch(loadPaymentHistory('2471'))
    store.dispatch(loadPaymentHistory('3975'))
    await vi.waitFor(() => expect(store.getState().receipts.paymentHistoryStatus).toBe('success'))
    first.resolve(receiptPayments)
    await Promise.resolve()

    expect(store.getState().receipts).toMatchObject({ paymentHistoryInvoiceId: '3975', payments: [] })
  })

  it('stores the error when the payment is rejected', async () => {
    vi.mocked(receiptsApi.recordArPayment).mockRejectedValue(httpError(400, { title: 'Invoice is already paid.' }))

    store.dispatch(recordArPayment(request))

    await vi.waitFor(() => expect(store.getState().receipts.saveStatus).toBe('error'))
    expect(store.getState().receipts.saveError).toBe('Invoice is already paid.')
  })
})
