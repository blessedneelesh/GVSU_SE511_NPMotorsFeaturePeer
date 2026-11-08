import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearBankAccountSelection,
  createBankAccount,
  createBankAccountFailure,
  createBankAccountSuccess,
  loadBankAccountByIdFailure,
  loadBankAccountByIdSuccess,
  loadBankAccounts,
  loadBankAccountsFailure,
  loadBankAccountsSuccess,
  loadBankOptions,
  loadBankOptionsFailure,
  loadBankOptionsSuccess,
  selectBankAccount,
  setBankAccountBankFilter,
} from '../../../redux/bankAccounts/bankAccounts.actions'
import { BANK_ACCOUNT_ACTIONS } from '../../../redux/bankAccounts/bankAccounts.constants'
import bankAccountsSaga from '../../../redux/bankAccounts/bankAccounts.saga'
import { selectBankAccountQuery } from '../../../redux/bankAccounts/bankAccounts.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { bankAccountsApi } from '../../../services/bankAccounts/bankAccounts.api'
import { getBankAccountErrorMessage, getBankAccountSaveError } from '../../../services/bankAccounts/bankAccounts.errors'
import { bankAccount, bankAccountPage, bankOptions, formValues, sparseBankAccount } from '../../../test/fixtures/bankAccounts'
import type { BankAccount, BankAccountPage, BankAccountQuery } from '../../../types/bankAccounts'

vi.mock('../../../services/bankAccounts/bankAccounts.api', () => ({
  bankAccountsApi: { getBankAccounts: vi.fn(), getBankAccountById: vi.fn(), addBankAccount: vi.fn(), getBankOptions: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = bankAccountsSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadBankAccountsWorker = workerAt(0)
const loadBankAccountByIdWorker = workerAt(1)
const loadBankOptionsWorker = workerAt(2)
const createBankAccountWorker = workerAt(3)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: BankAccountQuery = { pageNumber: 2, pageSize: 10, bankId: '1', searchTerm: 'chase' }

describe('bankAccountsSaga (root)', () => {
  it('starts the four watchers with the right patterns and effects', () => {
    const gen = bankAccountsSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([BANK_ACCOUNT_ACTIONS.LOAD, BANK_ACCOUNT_ACTIONS.SET_BANK_FILTER, BANK_ACCOUNT_ACTIONS.SET_PAGE,
        BANK_ACCOUNT_ACTIONS.SET_PAGE_SIZE, BANK_ACCOUNT_ACTIONS.SET_SEARCH], loadBankAccountsWorker),
      takeLatest([BANK_ACCOUNT_ACTIONS.SELECT, BANK_ACCOUNT_ACTIONS.CLEAR_SELECTION], loadBankAccountByIdWorker),
      takeLatest(BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS, loadBankOptionsWorker),
      takeLeading(BANK_ACCOUNT_ACTIONS.CREATE, createBankAccountWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadBankAccountsWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadBankAccountsWorker(loadBankAccounts())
    expect(gen.next().value).toStrictEqual(select(selectBankAccountQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(bankAccountsApi.getBankAccounts, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(bankAccountPage).value).toStrictEqual(put(loadBankAccountsSuccess(bankAccountPage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails title when the request fails', () => {
    const { gen } = startLoad()
    expect(gen.throw(httpError(400, { title: 'Bad filter' })).value).toStrictEqual(put(loadBankAccountsFailure('Bad filter')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadBankAccountsFailure(getBankAccountErrorMessage(err))))
    expect(getBankAccountErrorMessage(err)).toMatch(/unreachable/)
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

describe('loadBankAccountByIdWorker', () => {
  const startLookup = () => {
    const gen = loadBankAccountByIdWorker(selectBankAccount('1'))
    const effect = gen.next().value
    expect(effect).toEqual(call(bankAccountsApi.getBankAccountById, '1', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing for CLEAR_SELECTION, which only exists to cancel a lookup', () => {
    const gen = loadBankAccountByIdWorker(clearBankAccountSelection())
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the loaded account', () => {
    const { gen, signal } = startLookup()
    expect(gen.next(bankAccount).value).toStrictEqual(put(loadBankAccountByIdSuccess(bankAccount)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the not-found message when the account is gone', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(loadBankAccountByIdFailure('This bank account no longer exists.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title for other errors', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(500, { title: 'Boom' })).value).toStrictEqual(put(loadBankAccountByIdFailure('Boom')))
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

describe('loadBankOptionsWorker', () => {
  const startOptions = () => {
    const gen = loadBankOptionsWorker(loadBankOptions())
    const effect = gen.next().value
    expect(effect).toEqual(call(bankAccountsApi.getBankOptions, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[0] as AbortSignal }
  }

  it('dispatches the loaded banks', () => {
    const { gen, signal } = startOptions()
    expect(gen.next(bankOptions).value).toStrictEqual(put(loadBankOptionsSuccess(bankOptions)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('falls back to the banks message when the error has no detail', () => {
    const { gen } = startOptions()
    expect(gen.throw(httpError(400)).value).toStrictEqual(put(loadBankOptionsFailure('Banks could not be loaded. Please try again.')))
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

describe('createBankAccountWorker', () => {
  const startCreate = () => {
    const gen = createBankAccountWorker(createBankAccount(formValues))
    expect(gen.next().value).toStrictEqual(call(bankAccountsApi.addBankAccount, formValues))
    return gen
  }

  it('dispatches success and then reloads the list', () => {
    const gen = startCreate()
    expect(gen.next().value).toStrictEqual(put(createBankAccountSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadBankAccounts()))
    expect(gen.next().done).toBe(true)
  })

  it('maps 400 validation errors to form fields with no banner message', () => {
    const gen = startCreate()
    // The real AddBankAccount 400 body, keyed by PascalCase property names
    const body = { errors: { Name: ['The Name field is required.'], BankId: ['A bank account must belong to a bank.'] } }
    expect(gen.throw(httpError(400, body)).value).toStrictEqual(put(createBankAccountFailure({
      message: '',
      fieldErrors: { name: 'The Name field is required.', bankId: 'A bank account must belong to a bank.' },
    })))
    expect(gen.next().done).toBe(true)
  })

  it('shows a 400 that matches no field as the banner message', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400, { title: 'Invalid' })).value)
      .toStrictEqual(put(createBankAccountFailure({ message: 'Invalid', fieldErrors: {} })))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the save error for a server error', () => {
    const gen = startCreate()
    const err = httpError(500, { title: 'Server error' })
    expect(gen.throw(err).value).toStrictEqual(put(createBankAccountFailure(getBankAccountSaveError(err))))
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

describe('bankAccountsSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(bankAccountsApi.getBankAccounts).mockResolvedValue(bankAccountPage)
    vi.mocked(bankAccountsApi.getBankAccountById).mockResolvedValue(bankAccount)
    vi.mocked(bankAccountsApi.addBankAccount).mockResolvedValue(undefined)
    vi.mocked(bankAccountsApi.getBankOptions).mockResolvedValue(bankOptions)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(bankAccountsSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('ignores a second create while the first is still saving', async () => {
    const save = deferred<void>()
    vi.mocked(bankAccountsApi.addBankAccount).mockReturnValue(save.promise)

    store.dispatch(createBankAccount(formValues))
    store.dispatch(createBankAccount(formValues))
    expect(bankAccountsApi.addBankAccount).toHaveBeenCalledTimes(1)

    save.resolve()
    await vi.waitFor(() => expect(store.getState().bankAccounts.saveStatus).toBe('success'))
    expect(bankAccountsApi.addBankAccount).toHaveBeenCalledTimes(1)
  })

  it('reloads the list after a successful create', async () => {
    store.dispatch(createBankAccount(formValues))

    await vi.waitFor(() => expect(store.getState().bankAccounts.listStatus).toBe('success'))
    expect(store.getState().bankAccounts.saveStatus).toBe('success')
    expect(bankAccountsApi.addBankAccount).toHaveBeenCalledWith(formValues)
    expect(bankAccountsApi.getBankAccounts).toHaveBeenCalledTimes(1)
    expect(store.getState().bankAccounts.items).toEqual(bankAccountPage.items)
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<BankAccountPage>()
    const second = deferred<BankAccountPage>()
    vi.mocked(bankAccountsApi.getBankAccounts).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setBankAccountBankFilter('1'))
    store.dispatch(setBankAccountBankFilter('2'))
    const firstSignal = vi.mocked(bankAccountsApi.getBankAccounts).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)

    second.resolve({ items: [sparseBankAccount], hasNext: false })
    await vi.waitFor(() => expect(store.getState().bankAccounts.listStatus).toBe('success'))
    first.resolve({ items: [bankAccount], hasNext: true })
    await flush()

    expect(store.getState().bankAccounts.items).toEqual([sparseBankAccount])
    expect(store.getState().bankAccounts.query.bankId).toBe('2')
  })

  it('cancels the detail lookup when the detail view is closed', async () => {
    const lookup = deferred<BankAccount>()
    vi.mocked(bankAccountsApi.getBankAccountById).mockReturnValue(lookup.promise)

    store.dispatch(selectBankAccount('1'))
    store.dispatch(clearBankAccountSelection())
    expect(vi.mocked(bankAccountsApi.getBankAccountById).mock.calls[0]?.[1]?.aborted).toBe(true)

    lookup.resolve(bankAccount)
    await flush()
    expect(store.getState().bankAccounts.selected).toBeNull()
    expect(store.getState().bankAccounts.detailStatus).toBe('idle')
  })

  it('stores the loaded bank options', async () => {
    store.dispatch(loadBankOptions())

    await vi.waitFor(() => expect(store.getState().bankAccounts.bankOptionsStatus).toBe('success'))
    expect(store.getState().bankAccounts.bankOptions).toEqual(bankOptions)
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(bankAccountsApi.getBankAccounts).mockRejectedValue(httpError(400, { title: 'Bad filter' }))

    store.dispatch(loadBankAccounts())

    await vi.waitFor(() => expect(store.getState().bankAccounts.listStatus).toBe('error'))
    expect(store.getState().bankAccounts.listError).toBe('Bad filter')
  })
})
