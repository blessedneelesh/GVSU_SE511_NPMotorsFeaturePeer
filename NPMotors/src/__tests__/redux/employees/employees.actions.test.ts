import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/employees/employees.actions'
import { EMPLOYEE_ACTIONS } from '../../../redux/employees/employees.constants'
import { employee, employeeFormValues, employeePage, employeeSaveError } from '../../../test/fixtures/employees'

describe('employees actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadEmployees', actions.loadEmployees, EMPLOYEE_ACTIONS.LOAD],
      ['clearEmployeeSelection', actions.clearEmployeeSelection, EMPLOYEE_ACTIONS.CLEAR_SELECTION],
      ['createEmployeeSuccess', actions.createEmployeeSuccess, EMPLOYEE_ACTIONS.CREATE_SUCCESS],
      ['resetEmployeeSave', actions.resetEmployeeSave, EMPLOYEE_ACTIONS.RESET_SAVE],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadEmployeesSuccess carries the page', () => {
    expect(actions.loadEmployeesSuccess(employeePage)).toEqual({ type: EMPLOYEE_ACTIONS.LOAD_SUCCESS, payload: employeePage })
  })

  it('loadEmployeesFailure carries the message', () => {
    expect(actions.loadEmployeesFailure('Network error')).toEqual({ type: EMPLOYEE_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setEmployeeSearch carries the search term', () => {
    expect(actions.setEmployeeSearch('lopez')).toEqual({ type: EMPLOYEE_ACTIONS.SET_SEARCH, payload: 'lopez' })
  })

  it('setEmployeeDepartmentFilter carries the department', () => {
    expect(actions.setEmployeeDepartmentFilter('Service')).toEqual({ type: EMPLOYEE_ACTIONS.SET_DEPARTMENT_FILTER, payload: 'Service' })
  })

  it('setEmployeeStatusFilter carries the status', () => {
    expect(actions.setEmployeeStatusFilter('inactive')).toEqual({ type: EMPLOYEE_ACTIONS.SET_STATUS_FILTER, payload: 'inactive' })
  })

  it('setEmployeePage carries the page number', () => {
    expect(actions.setEmployeePage(3)).toEqual({ type: EMPLOYEE_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setEmployeePageSize carries the page size', () => {
    expect(actions.setEmployeePageSize(25)).toEqual({ type: EMPLOYEE_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('selectEmployee carries the id', () => {
    expect(actions.selectEmployee('12')).toEqual({ type: EMPLOYEE_ACTIONS.SELECT, payload: '12' })
  })

  it('loadEmployeeByIdSuccess carries the employee', () => {
    expect(actions.loadEmployeeByIdSuccess(employee)).toEqual({ type: EMPLOYEE_ACTIONS.LOAD_BY_ID_SUCCESS, payload: employee })
  })

  it('loadEmployeeByIdFailure carries the message', () => {
    expect(actions.loadEmployeeByIdFailure('Not found')).toEqual({ type: EMPLOYEE_ACTIONS.LOAD_BY_ID_FAILURE, payload: 'Not found' })
  })

  it('createEmployee carries the form values', () => {
    expect(actions.createEmployee(employeeFormValues)).toEqual({ type: EMPLOYEE_ACTIONS.CREATE, payload: employeeFormValues })
  })

  it('createEmployeeFailure carries the save error', () => {
    expect(actions.createEmployeeFailure(employeeSaveError)).toEqual({ type: EMPLOYEE_ACTIONS.CREATE_FAILURE, payload: employeeSaveError })
  })
})
