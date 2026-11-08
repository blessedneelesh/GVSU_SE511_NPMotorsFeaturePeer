import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTransactionSelection,
  loadTransactionAccountOptions,
  loadTransactionAccountOptionsFailure,
  loadTransactionAccountOptionsSuccess,
  loadTransactionByIdFailure,
  loadTransactionByIdSuccess,
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess,
  resetTransactionFilters,
  selectTransaction,
  setTransactionDirectionFilter,
} from '../../../redux/transactions/transactions.actions'
import { TRANSACTION_ACTIONS } from '../../../redux/transactions/transactions.constants'
import transactionsSaga from '../../../redux/transactions/transactions.saga'
import { selectTransactionQuery } from '../../../redux/transactions/transactions.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { transactionsApi } from '../../../services/transactions/transactions.api'
import { getTransactionErrorMessage } from '../../../services/transactions/transactions.errors'
import { accountOptions, outgoingTransaction, transaction, transactionPage } from '../../../test/fixtures/transactions'
import type { Transaction, TransactionPage, TransactionQuery } from '../../../types/transactions'

vi.mock('../../../services/transactions/transactions.api', () => ({
  transactionsApi: { getTransactions: vi.fn(), getTransactionById: vi.fn(), getAccountOptions: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = transactionsSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadTransactionsWorker = workerAt(0)
const loadTransactionByIdWorker = workerAt(1)
const loadAccountOptionsWorker = workerAt(2)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: TransactionQuery = { pageNumber: 2, pageSize: 10, bankAccountId: '1', direction: 'in', dateFrom: '2026-11-01', dateTo: '' }

describe('transactionsSaga (root)', () => {
  it('starts the three watchers with the right patterns and effects', () => {
    const gen = transactionsSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([TRANSACTION_ACTIONS.LOAD, TRANSACTION_ACTIONS.SET_BANK_ACCOUNT_FILTER, TRANSACTION_ACTIONS.SET_DIRECTION_FILTER,
        TRANSACTION_ACTIONS.SET_DATE_FROM, TRANSACTION_ACTIONS.SET_DATE_TO, TRANSACTION_ACTIONS.RESET_FILTERS,
        TRANSACTION_ACTIONS.SET_PAGE, TRANSACTION_ACTIONS.SET_PAGE_SIZE], loadTransactionsWorker),
      takeLatest([TRANSACTION_ACTIONS.SELECT, TRANSACTION_ACTIONS.CLEAR_SELECTION], loadTransactionByIdWorker),
      takeLatest(TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS, loadAccountOptionsWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadTransactionsWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadTransactionsWorker(loadTransactions())
    expect(gen.next().value).toStrictEqual(select(selectTransactionQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(transactionsApi.getTransactions, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(transactionPage).value).toStrictEqual(put(loadTransactionsSuccess(transactionPage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { title: 'Bad date' })).value).toStrictEqual(put(loadTransactionsFailure('Bad date')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadTransactionsFailure(getTransactionErrorMessage(err))))
    expect(getTransactionErrorMessage(err)).toMatch(/unreachable/)
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

describe('loadTransactionByIdWorker', () => {
  const startLookup = () => {
    const gen = loadTransactionByIdWorker(selectTransaction('2990'))
    const effect = gen.next().value
    expect(effect).toEqual(call(transactionsApi.getTransactionById, '2990', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing for CLEAR_SELECTION, which only exists to cancel a lookup', () => {
    const gen = loadTransactionByIdWorker(clearTransactionSelection())
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the loaded transaction', () => {
    const { gen, signal } = startLookup()
    expect(gen.next(transaction).value).toStrictEqual(put(loadTransactionByIdSuccess(transaction)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the not-found message when the transaction is gone', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(loadTransactionByIdFailure('This transaction no longer exists.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title for other errors', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(500, { title: 'Boom' })).value).toStrictEqual(put(loadTransactionByIdFailure('Boom')))
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

describe('loadAccountOptionsWorker', () => {
  const startOptions = () => {
    const gen = loadAccountOptionsWorker(loadTransactionAccountOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(transactionsApi.getAccountOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded accounts', () => {
    const { gen, signal } = startOptions()
    expect(gen.next(accountOptions).value).toStrictEqual(put(loadTransactionAccountOptionsSuccess(accountOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('falls back to the accounts message when the error has no detail', () => {
    const { gen } = startOptions()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadTransactionAccountOptionsFailure('Bank accounts could not be loaded. Please try again.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
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

describe('transactionsSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(transactionsApi.getTransactions).mockResolvedValue(transactionPage)
    vi.mocked(transactionsApi.getTransactionById).mockResolvedValue(transaction)
    vi.mocked(transactionsApi.getAccountOptions).mockResolvedValue(accountOptions)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(transactionsSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<TransactionPage>()
    const second = deferred<TransactionPage>()
    vi.mocked(transactionsApi.getTransactions).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setTransactionDirectionFilter('in'))
    store.dispatch(setTransactionDirectionFilter('out'))
    const firstSignal = vi.mocked(transactionsApi.getTransactions).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)

    second.resolve({ items: [outgoingTransaction], hasNext: false })
    await vi.waitFor(() => expect(store.getState().transactions.listStatus).toBe('success'))
    first.resolve({ items: [transaction], hasNext: true })
    await flush()

    expect(store.getState().transactions.items).toEqual([outgoingTransaction])
    expect(store.getState().transactions.query.direction).toBe('out')
  })

  it('reloads with the default query after the filters are reset', async () => {
    store.dispatch(setTransactionDirectionFilter('out'))
    await vi.waitFor(() => expect(store.getState().transactions.listStatus).toBe('success'))

    store.dispatch(resetTransactionFilters())
    await vi.waitFor(() => expect(transactionsApi.getTransactions).toHaveBeenCalledTimes(2))
    expect(vi.mocked(transactionsApi.getTransactions).mock.calls[1]?.[0]).toEqual({
      pageNumber: 1, pageSize: 5, bankAccountId: 'all', direction: 'all', dateFrom: '', dateTo: '',
    })
  })

  it('cancels the detail lookup when the detail view is closed', async () => {
    const lookup = deferred<Transaction>()
    vi.mocked(transactionsApi.getTransactionById).mockReturnValue(lookup.promise)

    store.dispatch(selectTransaction('2990'))
    store.dispatch(clearTransactionSelection())
    expect(vi.mocked(transactionsApi.getTransactionById).mock.calls[0]?.[1]?.aborted).toBe(true)

    lookup.resolve(transaction)
    await flush()
    expect(store.getState().transactions.selected).toBeNull()
    expect(store.getState().transactions.detailStatus).toBe('idle')
  })

  it('stores the loaded account options', async () => {
    store.dispatch(loadTransactionAccountOptions())

    await vi.waitFor(() => expect(store.getState().transactions.accountOptionsStatus).toBe('success'))
    expect(store.getState().transactions.accountOptions).toEqual(accountOptions)
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(transactionsApi.getTransactions).mockRejectedValue(httpError(400, { title: 'Bad date' }))

    store.dispatch(loadTransactions())

    await vi.waitFor(() => expect(store.getState().transactions.listStatus).toBe('error'))
    expect(store.getState().transactions.listError).toBe('Bad date')
  })
})
