import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadStatementLineAccountOptions,
  loadStatementLineAccountOptionsFailure,
  loadStatementLineAccountOptionsSuccess,
  loadStatementLines,
  loadStatementLinesFailure,
  loadStatementLinesSuccess,
  setStatementLineBankAccountFilter,
  setStatementLineTypeFilter,
} from '../../../redux/statementLines/statementLines.actions'
import { STATEMENT_LINE_ACTIONS } from '../../../redux/statementLines/statementLines.constants'
import statementLinesSaga from '../../../redux/statementLines/statementLines.saga'
import { selectStatementLineQuery } from '../../../redux/statementLines/statementLines.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { statementLinesApi } from '../../../services/statementLines/statementLines.api'
import { getStatementLineErrorMessage } from '../../../services/statementLines/statementLines.errors'
import { depositLine, statementAccountOptions, statementLinePage, withdrawalLine } from '../../../test/fixtures/statementLines'
import type { StatementLinePage, StatementLineQuery } from '../../../types/statementLines'

vi.mock('../../../services/statementLines/statementLines.api', () => ({
  statementLinesApi: { getStatementLines: vi.fn(), getAccountOptions: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = statementLinesSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadStatementLinesWorker = workerAt(0)
const loadAccountOptionsWorker = workerAt(1)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: StatementLineQuery = { pageNumber: 2, pageSize: 10, bankAccountId: '1', month: '2024-03', type: 'all' }

describe('statementLinesSaga (root)', () => {
  it('starts the two watchers with the right patterns and effects', () => {
    const gen = statementLinesSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([STATEMENT_LINE_ACTIONS.LOAD, STATEMENT_LINE_ACTIONS.SET_BANK_ACCOUNT_FILTER, STATEMENT_LINE_ACTIONS.SET_MONTH_FILTER,
        STATEMENT_LINE_ACTIONS.SET_TYPE_FILTER, STATEMENT_LINE_ACTIONS.RESET_FILTERS,
        STATEMENT_LINE_ACTIONS.SET_PAGE, STATEMENT_LINE_ACTIONS.SET_PAGE_SIZE], loadStatementLinesWorker),
      takeLatest(STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS, loadAccountOptionsWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadStatementLinesWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadStatementLinesWorker(loadStatementLines())
    expect(gen.next().value).toStrictEqual(select(selectStatementLineQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(statementLinesApi.getStatementLines, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(statementLinePage).value).toStrictEqual(put(loadStatementLinesSuccess(statementLinePage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { title: 'Bad month' })).value).toStrictEqual(put(loadStatementLinesFailure('Bad month')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadStatementLinesFailure(getStatementLineErrorMessage(err))))
    expect(getStatementLineErrorMessage(err)).toMatch(/unreachable/)
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('falls back to the statement message when the error has no detail', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadStatementLinesFailure('The bank statement could not be loaded. Please try again.')))
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

describe('loadAccountOptionsWorker', () => {
  const startOptions = () => {
    const gen = loadAccountOptionsWorker(loadStatementLineAccountOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(statementLinesApi.getAccountOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded accounts', () => {
    const { gen, signal } = startOptions()
    expect(gen.next(statementAccountOptions).value).toStrictEqual(put(loadStatementLineAccountOptionsSuccess(statementAccountOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('falls back to the accounts message when the error has no detail', () => {
    const { gen } = startOptions()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadStatementLineAccountOptionsFailure('Bank accounts could not be loaded. Please try again.')))
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

describe('statementLinesSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(statementLinesApi.getStatementLines).mockResolvedValue(statementLinePage)
    vi.mocked(statementLinesApi.getAccountOptions).mockResolvedValue(statementAccountOptions)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(statementLinesSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<StatementLinePage>()
    const second = deferred<StatementLinePage>()
    vi.mocked(statementLinesApi.getStatementLines).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setStatementLineTypeFilter('BankReceipt'))
    store.dispatch(setStatementLineTypeFilter('BankPayment'))
    const firstSignal = vi.mocked(statementLinesApi.getStatementLines).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)

    second.resolve({ items: [withdrawalLine], hasNext: false })
    await vi.waitFor(() => expect(store.getState().statementLines.listStatus).toBe('success'))
    first.resolve({ items: [depositLine], hasNext: true })
    await flush()

    expect(store.getState().statementLines.items).toEqual([withdrawalLine])
    expect(store.getState().statementLines.query.type).toBe('BankPayment')
  })

  it('reloads the chosen account with the month and type cleared', async () => {
    store.dispatch(setStatementLineTypeFilter('Transfer'))
    await vi.waitFor(() => expect(store.getState().statementLines.listStatus).toBe('success'))

    store.dispatch(setStatementLineBankAccountFilter('4'))
    await vi.waitFor(() => expect(statementLinesApi.getStatementLines).toHaveBeenCalledTimes(2))
    expect(vi.mocked(statementLinesApi.getStatementLines).mock.calls[1]?.[0]).toEqual({
      pageNumber: 1, pageSize: 5, bankAccountId: '4', month: '', type: 'all',
    })
  })

  it('stores the loaded account options', async () => {
    store.dispatch(loadStatementLineAccountOptions())

    await vi.waitFor(() => expect(store.getState().statementLines.accountOptionsStatus).toBe('success'))
    expect(store.getState().statementLines.accountOptions).toEqual(statementAccountOptions)
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(statementLinesApi.getStatementLines).mockRejectedValue(httpError(400, { title: 'Bad month' }))

    store.dispatch(loadStatementLines())

    await vi.waitFor(() => expect(store.getState().statementLines.listStatus).toBe('error'))
    expect(store.getState().statementLines.listError).toBe('Bad month')
  })
})
