import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { applyMiddleware, legacy_createStore as createStore, type UnknownAction } from 'redux'
import createSagaMiddleware, { type SagaIterator, type Task } from 'redux-saga'
import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearEmployeeSelection,
  createEmployee,
  createEmployeeFailure,
  createEmployeeSuccess,
  loadEmployeeByIdFailure,
  loadEmployeeByIdSuccess,
  loadEmployees,
  loadEmployeesFailure,
  loadEmployeesSuccess,
  selectEmployee,
  setEmployeeDepartmentFilter,
} from '../../../redux/employees/employees.actions'
import { EMPLOYEE_ACTIONS } from '../../../redux/employees/employees.constants'
import employeesSaga from '../../../redux/employees/employees.saga'
import { selectEmployeeQuery } from '../../../redux/employees/employees.selectors'
import { rootReducer } from '../../../redux/rootReducer'
import { employeesApi } from '../../../services/employees/employees.api'
import { getEmployeeErrorMessage, getEmployeeSaveError } from '../../../services/employees/employees.errors'
import { employee, employeeFormValues, employeePage, sparseEmployee } from '../../../test/fixtures/employees'
import type { Employee, EmployeePage, EmployeeQuery } from '../../../types/employees'

vi.mock('../../../services/employees/employees.api', () => ({
  employeesApi: { getEmployees: vi.fn(), getEmployeeById: vi.fn(), addEmployee: vi.fn() },
}))

// The workers aren't exported; take them from the watchers in the root saga's all([...]) effect
type Worker = (action: UnknownAction) => SagaIterator
interface ForkEffect { payload: { args: [unknown, Worker] } }
const rootEffect = employeesSaga().next().value as { payload: ForkEffect[] }
const workerAt = (index: number): Worker => {
  const effect = rootEffect.payload[index]
  if (!effect) throw new Error(`No watcher at index ${index}`)
  return effect.payload.args[1]
}
const loadEmployeesWorker = workerAt(0)
const loadEmployeeByIdWorker = workerAt(1)
const createEmployeeWorker = workerAt(2)

// The error helpers check axios.isAxiosError / axios.isCancel, so failures must be real axios errors
const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })
const canceled = () => new CanceledError()

const query: EmployeeQuery = { pageNumber: 2, pageSize: 10, department: 'Sales', status: 'active', searchTerm: 'lopez' }

describe('employeesSaga (root)', () => {
  it('starts the three watchers with the right patterns and effects', () => {
    const gen = employeesSaga()
    expect(gen.next().value).toStrictEqual(all([
      takeLatest([EMPLOYEE_ACTIONS.LOAD, EMPLOYEE_ACTIONS.SET_DEPARTMENT_FILTER, EMPLOYEE_ACTIONS.SET_STATUS_FILTER,
        EMPLOYEE_ACTIONS.SET_PAGE, EMPLOYEE_ACTIONS.SET_PAGE_SIZE, EMPLOYEE_ACTIONS.SET_SEARCH], loadEmployeesWorker),
      takeLatest([EMPLOYEE_ACTIONS.SELECT, EMPLOYEE_ACTIONS.CLEAR_SELECTION], loadEmployeeByIdWorker),
      takeLeading(EMPLOYEE_ACTIONS.CREATE, createEmployeeWorker),
    ]))
    expect(gen.next().done).toBe(true)
  })
})

describe('loadEmployeesWorker', () => {
  // Steps to the API call and returns the generator with the signal the worker created
  const startLoad = () => {
    const gen = loadEmployeesWorker(loadEmployees())
    expect(gen.next().value).toStrictEqual(select(selectEmployeeQuery))
    const effect = gen.next(query).value
    expect(effect).toEqual(call(employeesApi.getEmployees, query, expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('dispatches the loaded page', () => {
    const { gen, signal } = startLoad()
    expect(gen.next(employeePage).value).toStrictEqual(put(loadEmployeesSuccess(employeePage)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the ProblemDetails message when the request fails', () => {
    const { gen } = startLoad()
    const err = httpError(400, { errors: { Status: ["The value 'bogus' is not valid."] } })
    expect(gen.throw(err).value).toStrictEqual(put(loadEmployeesFailure("The value 'bogus' is not valid.")))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the unreachable message when the API is down', () => {
    const { gen } = startLoad()
    const err = httpError(500)
    expect(gen.throw(err).value).toStrictEqual(put(loadEmployeesFailure(getEmployeeErrorMessage(err))))
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

describe('loadEmployeeByIdWorker', () => {
  const startLookup = () => {
    const gen = loadEmployeeByIdWorker(selectEmployee('12'))
    const effect = gen.next().value
    expect(effect).toEqual(call(employeesApi.getEmployeeById, '12', expect.any(AbortSignal)))
    return { gen, signal: effect.payload.args[1] as AbortSignal }
  }

  it('does nothing for CLEAR_SELECTION, which only exists to cancel a lookup', () => {
    const gen = loadEmployeeByIdWorker(clearEmployeeSelection())
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the loaded employee', () => {
    const { gen, signal } = startLookup()
    expect(gen.next(employee).value).toStrictEqual(put(loadEmployeeByIdSuccess(employee)))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
    expect(signal.aborted).toBe(false)
  })

  it('dispatches the not-found message when the employee is gone', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(404)).value).toStrictEqual(put(loadEmployeeByIdFailure('This employee no longer exists.')))
    expect(gen.next().value).toStrictEqual(cancelled())
    expect(gen.next(false).done).toBe(true)
  })

  it('dispatches the ProblemDetails title for other errors', () => {
    const { gen } = startLookup()
    expect(gen.throw(httpError(500, { title: 'Boom' })).value).toStrictEqual(put(loadEmployeeByIdFailure('Boom')))
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

describe('createEmployeeWorker', () => {
  const startCreate = () => {
    const gen = createEmployeeWorker(createEmployee(employeeFormValues))
    expect(gen.next().value).toStrictEqual(call(employeesApi.addEmployee, employeeFormValues))
    return gen
  }

  it('dispatches success and then reloads the list', () => {
    const gen = startCreate()
    expect(gen.next().value).toStrictEqual(put(createEmployeeSuccess()))
    expect(gen.next().value).toStrictEqual(put(loadEmployees()))
    expect(gen.next().done).toBe(true)
  })

  it('maps the 400 snake_case keys to their form fields with no banner message', () => {
    const gen = startCreate()
    const err = httpError(400, { errors: {
      First_Name: ['The First_Name field is required.'],
      Commission_Rate: ['Commission rate must be between 0 and 100.'],
    } })
    expect(gen.throw(err).value).toStrictEqual(put(createEmployeeFailure({
      message: '',
      fieldErrors: { firstName: 'The First_Name field is required.', commissionRate: 'Commission rate must be between 0 and 100.' },
    })))
    expect(gen.next().done).toBe(true)
  })

  it('maps a "$.salary" conversion error to the salary field and drops a key no field matches', () => {
    const gen = startCreate()
    const err = httpError(400, { errors: { dto: ['The dto field is required.'], '$.salary': ['Salary must be a number'] } })
    expect(gen.throw(err).value).toStrictEqual(put(createEmployeeFailure({ message: '', fieldErrors: { salary: 'Salary must be a number' } })))
    expect(gen.next().done).toBe(true)
  })

  it('shows a 400 that matches no field as the banner message', () => {
    const gen = startCreate()
    expect(gen.throw(httpError(400, { title: 'Invalid' })).value)
      .toStrictEqual(put(createEmployeeFailure({ message: 'Invalid', fieldErrors: {} })))
    expect(gen.next().done).toBe(true)
  })

  it('dispatches the save error for a server error', () => {
    const gen = startCreate()
    const err = httpError(500, { title: 'Server error' })
    expect(gen.throw(err).value).toStrictEqual(put(createEmployeeFailure(getEmployeeSaveError(err))))
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

describe('employeesSaga (running)', () => {
  let task: Task
  let store: ReturnType<typeof createStore<ReturnType<typeof rootReducer>, UnknownAction>>

  beforeEach(() => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue(employeePage)
    vi.mocked(employeesApi.getEmployeeById).mockResolvedValue(employee)
    vi.mocked(employeesApi.addEmployee).mockResolvedValue(undefined)
    const saga = createSagaMiddleware()
    store = createStore(rootReducer, applyMiddleware(saga))
    task = saga.run(employeesSaga)
  })

  afterEach(() => {
    task.cancel()
  })

  it('ignores a second create while the first is still saving', async () => {
    const save = deferred<void>()
    vi.mocked(employeesApi.addEmployee).mockReturnValue(save.promise)

    store.dispatch(createEmployee(employeeFormValues))
    store.dispatch(createEmployee(employeeFormValues))
    expect(employeesApi.addEmployee).toHaveBeenCalledTimes(1)

    save.resolve()
    await vi.waitFor(() => expect(store.getState().employees.saveStatus).toBe('success'))
    expect(employeesApi.addEmployee).toHaveBeenCalledTimes(1)
  })

  it('reloads the list after a successful create', async () => {
    store.dispatch(createEmployee(employeeFormValues))

    await vi.waitFor(() => expect(store.getState().employees.listStatus).toBe('success'))
    expect(store.getState().employees.saveStatus).toBe('success')
    expect(employeesApi.addEmployee).toHaveBeenCalledWith(employeeFormValues)
    expect(employeesApi.getEmployees).toHaveBeenCalledTimes(1)
    expect(store.getState().employees.items).toEqual(employeePage.items)
  })

  it('keeps only the latest list response and aborts the stale request', async () => {
    const first = deferred<EmployeePage>()
    const second = deferred<EmployeePage>()
    vi.mocked(employeesApi.getEmployees).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    store.dispatch(setEmployeeDepartmentFilter('Sales'))
    store.dispatch(setEmployeeDepartmentFilter('Service'))
    const firstSignal = vi.mocked(employeesApi.getEmployees).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)
    expect(employeesApi.getEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ department: 'Service', pageNumber: 1 }), expect.any(AbortSignal))

    second.resolve({ items: [sparseEmployee], hasNext: false })
    await vi.waitFor(() => expect(store.getState().employees.listStatus).toBe('success'))
    first.resolve({ items: [employee], hasNext: true })
    await flush()

    expect(store.getState().employees.items).toEqual([sparseEmployee])
    expect(store.getState().employees.query.department).toBe('Service')
  })

  it('cancels the detail lookup when the detail view is closed', async () => {
    const lookup = deferred<Employee>()
    vi.mocked(employeesApi.getEmployeeById).mockReturnValue(lookup.promise)

    store.dispatch(selectEmployee('12'))
    store.dispatch(clearEmployeeSelection())
    expect(vi.mocked(employeesApi.getEmployeeById).mock.calls[0]?.[1]?.aborted).toBe(true)

    lookup.resolve(employee)
    await flush()
    expect(store.getState().employees.selected).toBeNull()
    expect(store.getState().employees.detailStatus).toBe('idle')
  })

  it('stores the error message when the list fails to load', async () => {
    vi.mocked(employeesApi.getEmployees).mockRejectedValue(httpError(400, { title: 'Bad filter' }))

    store.dispatch(loadEmployees())

    await vi.waitFor(() => expect(store.getState().employees.listStatus).toBe('error'))
    expect(store.getState().employees.listError).toBe('Bad filter')
  })

  it('leaves the customers and vendors slices untouched', async () => {
    store.dispatch(loadEmployees())
    await vi.waitFor(() => expect(store.getState().employees.listStatus).toBe('success'))
    expect(store.getState().customers.listStatus).toBe('idle')
    expect(store.getState().vendors.listStatus).toBe('idle')
  })
})
