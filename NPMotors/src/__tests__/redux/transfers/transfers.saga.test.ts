import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTransfer,
  createTransferFailure,
  createTransferSuccess,
  loadTransferAccountOptions,
  loadTransferAccountOptionsFailure,
  loadTransferAccountOptionsSuccess,
} from '../../../redux/transfers/transfers.actions'
import { TRANSFER_ACTIONS } from '../../../redux/transfers/transfers.constants'
import transfersSaga from '../../../redux/transfers/transfers.saga'
import { rootReducer } from '../../../redux/rootReducer'
import { transfersApi } from '../../../services/transfers/transfers.api'
import { getTransferSaveError } from '../../../services/transfers/transfers.errors'
import { accountOptions, formValues } from '../../../test/fixtures/transfers'

vi.mock('../../../services/transfers/transfers.api', () => ({
  transfersApi: { getAccountOptions: vi.fn(), createTransfer: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = transfersSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadAccountOptionsWorker = workerAt(0)
const createTransferWorker = workerAt(1)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

describe('transfersSaga (root)', () => {
  it('starts the two watchers with the right patterns and effects', () => {
    const gen = transfersSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest(TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS, loadAccountOptionsWorker),
      takeLeading(TRANSFER_ACTIONS.CREATE, createTransferWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadAccountOptionsWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startOptions = () => {
    const gen = loadAccountOptionsWorker(loadTransferAccountOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(transfersApi.getAccountOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded accounts', () => {
    const { gen, signal } = startOptions()
    expect(gen.next(accountOptions).value).toStrictEqual(put(loadTransferAccountOptionsSuccess(accountOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startOptions()
    expect(gen.throw(httpError(400, { title: 'Bad request' })).value).toStrictEqual(put(loadTransferAccountOptionsFailure('Bad request')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('falls back to the accounts message when the error has no detail', () => {
    const { gen } = startOptions()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(loadTransferAccountOptionsFailure('Bank accounts could not be loaded. Please try again.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startOptions()
    const step = gen.throw(httpError(502))
    expect(step.value).toStrictEqual(put(loadTransferAccountOptionsFailure(
      'Transfer service is unreachable. Is the API running on https://localhost:7003?',
    )))
  })

  it('dispatches nothing when the request was cancelled', () => {
    const { gen } = startOptions()
    expect(gen.throw(canceled()).value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('aborts the request when takeLatest cancels the worker', () => {
    const { gen, signal } = startOptions()
    const step = gen.return(undefined)
    expect(step.value).toStrictEqual(cancelled())
    expect(step.done).toBe(false)
    expect(gen.next(true).done).toBe(true)
    expect(signal.aborted).toBe(true)
  })
})

describe('createTransferWorker', () => {
  const startCreate = () => {
    const gen = createTransferWorker(createTransfer(formValues))
    expect(gen.next().value).toStrictEqual(call(transfersApi.createTransfer, formValues))
    return gen
  }

  it('dispatches success and then reloads the accounts, whose balances changed', () => {
    const gen = startCreate()
    expect(gen.next().value).toStrictEqual(put(createTransferSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadTransferAccountOptions()))
    expect(gen.next().done).toBe(true)
  })

  it('maps 400 validation errors to form fields with no banner message', () => {
    const gen = startCreate()
    // ASP.NET keys model errors by PascalCase property names, and JSON binding errors by "$.property"
    const body = { errors: { SourceAccountId: ['The source account is required.'], '$.amount': ['The amount is not a number.'] } }
    expect(gen.throw(httpError(400, body)).value).toStrictEqual(put(createTransferFailure({
      message: '',
      fieldErrors: { sourceAccountId: 'The source account is required.', amount: 'The amount is not a number.' },
    })))
    expect(gen.next().done).toBe(true)
  })

  it('shows a 400 that matches no field, such as insufficient funds, as the banner message', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400, { detail: 'Insufficient funds in the source account.' })).value)
      .toStrictEqual(put(createTransferFailure({ message: 'Insufficient funds in the source account.', fieldErrors: {} })))
    expect(gen.next().done).toBe(true)
  })

  it('falls back to the post message when the error has no detail', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400)).value)
      .toStrictEqual(put(createTransferFailure({ message: 'The transfer could not be posted. Please try again.', fieldErrors: {} })))
  })

  it('dispatches the save error for a server error', () => {
    const gen = startCreate()
    const err = httpError(500, { title: 'Server error' })
    expect(gen.throw(err).value).toStrictEqual(put(createTransferFailure(getTransferSaveError(err))))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches nothing when the request was cancelled', () => {
    const gen = startCreate()
    // Nothing cancels a create today (the worker passes no signal), so this is latent
    expect(gen.throw(canceled()).done).toBe(true)
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

describe('transfersSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(transfersApi.getAccountOptions).mockResolvedValue(accountOptions)
    vi.mocked(transfersApi.createTransfer).mockResolvedValue(undefined)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(transfersSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('ignores a second post while the first is still in flight', async () => {
    const post = deferred<void>()
    vi.mocked(transfersApi.createTransfer).mockReturnValue(post.promise)

    store.dispatch(createTransfer(formValues))
    store.dispatch(createTransfer(formValues))
    expect(transfersApi.createTransfer).toHaveBeenCalledTimes(1)

    post.resolve()
    await vi.waitFor(() => expect(store.getState().transfers.saveStatus).toBe('success'))
    expect(transfersApi.createTransfer).toHaveBeenCalledTimes(1)
  })

  it('reloads the accounts after a successful post', async () => {
    store.dispatch(createTransfer(formValues))

    await vi.waitFor(() => expect(store.getState().transfers.accountOptionsStatus).toBe('success'))
    expect(store.getState().transfers.saveStatus).toBe('success')
    expect(transfersApi.createTransfer).toHaveBeenCalledWith(formValues)
    expect(transfersApi.getAccountOptions).toHaveBeenCalledTimes(1)
    expect(store.getState().transfers.accountOptions).toEqual(accountOptions)
  })

  it('stores the field errors when the post is rejected, and does not reload the accounts', async () => {
    vi.mocked(transfersApi.createTransfer).mockRejectedValue(httpError(400, { errors: { Amount: ['The amount must be greater than zero.'] } }))

    store.dispatch(createTransfer(formValues))

    await vi.waitFor(() => expect(store.getState().transfers.saveStatus).toBe('error'))
    expect(store.getState().transfers.fieldErrors).toEqual({ amount: 'The amount must be greater than zero.' })
    expect(store.getState().transfers.saveError).toBeNull()
    expect(transfersApi.getAccountOptions).not.toHaveBeenCalled()
  })

  it('stores the error message when the accounts fail to load', async () => {
    vi.mocked(transfersApi.getAccountOptions).mockRejectedValue(httpError(400, { title: 'Bad request' }))

    store.dispatch(loadTransferAccountOptions())

    await vi.waitFor(() => expect(store.getState().transfers.accountOptionsStatus).toBe('error'))
    expect(store.getState().transfers.accountOptionsError).toBe('Bad request')
  })
})
