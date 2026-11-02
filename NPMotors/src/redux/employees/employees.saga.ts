import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { employeesApi } from '../../services/employees/employees.api'
import { getEmployeeDetailErrorMessage, getEmployeeErrorMessage, getEmployeeSaveError } from '../../services/employees/employees.errors'
import type { Employee, EmployeePage, EmployeeQuery } from '../../types/employees'
import {
  type clearEmployeeSelection,
  type createEmployee,
  createEmployeeFailure,
  createEmployeeSuccess,
  loadEmployeeByIdFailure,
  loadEmployeeByIdSuccess,
  loadEmployees,
  loadEmployeesFailure,
  loadEmployeesSuccess,
  type selectEmployee,
} from './employees.actions'
import { EMPLOYEE_ACTIONS } from './employees.constants'
import { selectEmployeeQuery } from './employees.selectors'

function* loadEmployeesWorker(): SagaIterator {
  const query: EmployeeQuery = yield select(selectEmployeeQuery)
  const controller = new AbortController()
  try {
    const page: EmployeePage = yield call(employeesApi.getEmployees, query, controller.signal)
    yield put(loadEmployeesSuccess(page))
  } catch (error) {
    const message = getEmployeeErrorMessage(error)
    if (message) yield put(loadEmployeesFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type EmployeeDetailAction = ReturnType<typeof selectEmployee> | ReturnType<typeof clearEmployeeSelection>

function* loadEmployeeByIdWorker(action: EmployeeDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== EMPLOYEE_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const employee: Employee = yield call(employeesApi.getEmployeeById, action.payload, controller.signal)
    yield put(loadEmployeeByIdSuccess(employee))
  } catch (error) {
    const message = getEmployeeDetailErrorMessage(error)
    if (message) yield put(loadEmployeeByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* createEmployeeWorker(action: ReturnType<typeof createEmployee>): SagaIterator {
  try {
    yield call(employeesApi.addEmployee, action.payload)
    yield put(createEmployeeSuccess())
    // Paging is server-side, so refetch the current page instead of inserting the row locally
    yield put(loadEmployees())
  } catch (error) {
    const saveError = getEmployeeSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(createEmployeeFailure(saveError))
  }
}

export default function* employeesSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        EMPLOYEE_ACTIONS.LOAD,
        EMPLOYEE_ACTIONS.SET_DEPARTMENT_FILTER,
        EMPLOYEE_ACTIONS.SET_STATUS_FILTER,
        EMPLOYEE_ACTIONS.SET_PAGE,
        EMPLOYEE_ACTIONS.SET_PAGE_SIZE,
        EMPLOYEE_ACTIONS.SET_SEARCH,
      ],
      loadEmployeesWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([EMPLOYEE_ACTIONS.SELECT, EMPLOYEE_ACTIONS.CLEAR_SELECTION], loadEmployeeByIdWorker),
    // takeLeading ignores repeat submits while a save is in flight, so a double-click can't add the employee twice
    takeLeading(EMPLOYEE_ACTIONS.CREATE, createEmployeeWorker),
  ])
}
