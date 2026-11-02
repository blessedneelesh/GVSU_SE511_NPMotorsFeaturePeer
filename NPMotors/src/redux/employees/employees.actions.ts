import type {
  Employee,
  EmployeeDepartmentFilter,
  EmployeeFormValues,
  EmployeePage,
  EmployeeSaveError,
  EmployeeStatusFilter,
} from '../../types/employees'
import { EMPLOYEE_ACTIONS } from './employees.constants'

export const loadEmployees = () => ({ type: EMPLOYEE_ACTIONS.LOAD })

export const loadEmployeesSuccess = (page: EmployeePage) => ({ type: EMPLOYEE_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadEmployeesFailure = (message: string) => ({ type: EMPLOYEE_ACTIONS.LOAD_FAILURE, payload: message })

export const setEmployeeSearch = (searchTerm: string) => ({ type: EMPLOYEE_ACTIONS.SET_SEARCH, payload: searchTerm })

export const setEmployeeDepartmentFilter = (department: EmployeeDepartmentFilter) => ({ type: EMPLOYEE_ACTIONS.SET_DEPARTMENT_FILTER, payload: department })

export const setEmployeeStatusFilter = (status: EmployeeStatusFilter) => ({ type: EMPLOYEE_ACTIONS.SET_STATUS_FILTER, payload: status })

export const setEmployeePage = (pageNumber: number) => ({ type: EMPLOYEE_ACTIONS.SET_PAGE, payload: pageNumber })

export const setEmployeePageSize = (pageSize: number) => ({ type: EMPLOYEE_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and fetches the employee by id
export const selectEmployee = (id: string) => ({ type: EMPLOYEE_ACTIONS.SELECT, payload: id })

export const clearEmployeeSelection = () => ({ type: EMPLOYEE_ACTIONS.CLEAR_SELECTION })

export const loadEmployeeByIdSuccess = (employee: Employee) => ({ type: EMPLOYEE_ACTIONS.LOAD_BY_ID_SUCCESS, payload: employee })

export const loadEmployeeByIdFailure = (message: string) => ({ type: EMPLOYEE_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

export const createEmployee = (values: EmployeeFormValues) => ({ type: EMPLOYEE_ACTIONS.CREATE, payload: values })

export const createEmployeeSuccess = () => ({ type: EMPLOYEE_ACTIONS.CREATE_SUCCESS })

export const createEmployeeFailure = (error: EmployeeSaveError) => ({ type: EMPLOYEE_ACTIONS.CREATE_FAILURE, payload: error })

// Clears the save status and errors, e.g. when the form is opened or closed or the success banner is dismissed
export const resetEmployeeSave = () => ({ type: EMPLOYEE_ACTIONS.RESET_SAVE })

export type EmployeesAction =
  | ReturnType<typeof loadEmployees>
  | ReturnType<typeof loadEmployeesSuccess>
  | ReturnType<typeof loadEmployeesFailure>
  | ReturnType<typeof setEmployeeSearch>
  | ReturnType<typeof setEmployeeDepartmentFilter>
  | ReturnType<typeof setEmployeeStatusFilter>
  | ReturnType<typeof setEmployeePage>
  | ReturnType<typeof setEmployeePageSize>
  | ReturnType<typeof selectEmployee>
  | ReturnType<typeof clearEmployeeSelection>
  | ReturnType<typeof loadEmployeeByIdSuccess>
  | ReturnType<typeof loadEmployeeByIdFailure>
  | ReturnType<typeof createEmployee>
  | ReturnType<typeof createEmployeeSuccess>
  | ReturnType<typeof createEmployeeFailure>
  | ReturnType<typeof resetEmployeeSave>
