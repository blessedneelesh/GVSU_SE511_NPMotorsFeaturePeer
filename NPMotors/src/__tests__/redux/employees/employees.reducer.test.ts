import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/employees/employees.actions'
import { loadCustomers } from '../../../redux/customers/customers.actions'
import employeesReducer, { initialEmployeesState, type EmployeesState } from '../../../redux/employees/employees.reducer'
import { loadVendors } from '../../../redux/vendors/vendors.actions'
import { employee, employeeFormValues, employeePage, employeeSaveError } from '../../../test/fixtures/employees'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: EmployeesState): EmployeesState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.fieldErrors)
  return Object.freeze(state)
}

const initial = () => frozen({ ...initialEmployeesState, query: { ...initialEmployeesState.query }, items: [], fieldErrors: {} })

describe('employeesReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(employeesReducer(undefined, { type: '@@INIT' })).toEqual(initialEmployeesState)
  })

  it('starts on page 1 with 5 rows and no filters', () => {
    expect(initialEmployeesState.query).toEqual({ pageNumber: 1, pageSize: 5, department: 'all', status: 'all', searchTerm: '' })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(employeesReducer(state, { type: 'other/action' })).toBe(state)
  })

  it.each([
    ['customers', loadCustomers()],
    ['vendors', loadVendors()],
  ])('ignores %s actions', (_, action) => {
    const state = initial()
    expect(employeesReducer(state, action)).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialEmployeesState, listError: 'old error' })
      expect(employeesReducer(state, actions.loadEmployees())).toEqual({ ...initialEmployeesState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(employeesReducer(initial(), actions.loadEmployeesSuccess(employeePage))).toEqual({
        ...initialEmployeesState,
        items: employeePage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(employeesReducer(initial(), actions.loadEmployeesFailure('Network error'))).toEqual({
        ...initialEmployeesState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialEmployeesState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialEmployeesState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it('SET_SEARCH sets the term and resets to page 1', () => {
      expect(employeesReducer(onPage3(), actions.setEmployeeSearch('lopez'))).toEqual({
        ...initialEmployeesState,
        ...reloading,
        query: { ...initialEmployeesState.query, searchTerm: 'lopez', pageNumber: 1 },
      })
    })

    it('SET_DEPARTMENT_FILTER sets the department and resets to page 1', () => {
      expect(employeesReducer(onPage3(), actions.setEmployeeDepartmentFilter('Service'))).toEqual({
        ...initialEmployeesState,
        ...reloading,
        query: { ...initialEmployeesState.query, department: 'Service', pageNumber: 1 },
      })
    })

    it('SET_STATUS_FILTER sets the status and resets to page 1', () => {
      expect(employeesReducer(onPage3(), actions.setEmployeeStatusFilter('inactive'))).toEqual({
        ...initialEmployeesState,
        ...reloading,
        query: { ...initialEmployeesState.query, status: 'inactive', pageNumber: 1 },
      })
    })

    it('keeps the other filter when one changes', () => {
      const state = frozen({ ...initialEmployeesState, query: { ...initialEmployeesState.query, department: 'Sales' } })
      expect(employeesReducer(state, actions.setEmployeeStatusFilter('active')).query)
        .toEqual({ ...initialEmployeesState.query, department: 'Sales', status: 'active' })
    })

    it('SET_PAGE_SIZE sets the size and resets to page 1', () => {
      expect(employeesReducer(onPage3(), actions.setEmployeePageSize(25))).toEqual({
        ...initialEmployeesState,
        ...reloading,
        query: { ...initialEmployeesState.query, pageSize: 25, pageNumber: 1 },
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(employeesReducer(onPage3(), actions.setEmployeePage(4))).toEqual({
        ...initialEmployeesState,
        ...reloading,
        query: { ...initialEmployeesState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(employeesReducer(onPage3(), actions.setEmployeePage(0)).query.pageNumber).toBe(1)
      expect(employeesReducer(onPage3(), actions.setEmployeePage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('detail', () => {
    it('SELECT stores the id, clears the previous employee and starts loading', () => {
      const state = frozen({ ...initialEmployeesState, selected: employee, detailStatus: 'error', detailError: 'old error' })
      expect(employeesReducer(state, actions.selectEmployee('7'))).toEqual({
        ...initialEmployeesState,
        selectedId: '7',
        selected: null,
        detailStatus: 'loading',
        detailError: null,
      })
    })

    it('LOAD_BY_ID_SUCCESS stores the employee', () => {
      const state = frozen({ ...initialEmployeesState, selectedId: '12', detailStatus: 'loading' })
      expect(employeesReducer(state, actions.loadEmployeeByIdSuccess(employee))).toEqual({
        ...initialEmployeesState,
        selectedId: '12',
        selected: employee,
        detailStatus: 'success',
      })
    })

    it('LOAD_BY_ID_FAILURE stores the error', () => {
      const state = frozen({ ...initialEmployeesState, selectedId: '12', detailStatus: 'loading' })
      expect(employeesReducer(state, actions.loadEmployeeByIdFailure('Not found'))).toEqual({
        ...initialEmployeesState,
        selectedId: '12',
        detailStatus: 'error',
        detailError: 'Not found',
      })
    })

    it('CLEAR_SELECTION resets every detail field', () => {
      const state = frozen({ ...initialEmployeesState, selectedId: '12', selected: employee, detailStatus: 'error', detailError: 'x' })
      expect(employeesReducer(state, actions.clearEmployeeSelection())).toEqual(initialEmployeesState)
    })
  })

  describe('save', () => {
    it('CREATE starts saving and clears previous errors', () => {
      const state = frozen({ ...initialEmployeesState, saveStatus: 'error', saveError: 'old', fieldErrors: { firstName: 'required' } })
      expect(employeesReducer(state, actions.createEmployee(employeeFormValues))).toEqual({
        ...initialEmployeesState,
        saveStatus: 'loading',
        saveError: null,
        fieldErrors: {},
      })
    })

    it('CREATE_SUCCESS marks the save as successful', () => {
      const state = frozen({ ...initialEmployeesState, saveStatus: 'loading' })
      expect(employeesReducer(state, actions.createEmployeeSuccess())).toEqual({ ...initialEmployeesState, saveStatus: 'success' })
    })

    it('CREATE_FAILURE stores the message and field errors', () => {
      expect(employeesReducer(initial(), actions.createEmployeeFailure(employeeSaveError))).toEqual({
        ...initialEmployeesState,
        saveStatus: 'error',
        saveError: employeeSaveError.message,
        fieldErrors: employeeSaveError.fieldErrors,
      })
    })

    it('CREATE_FAILURE stores null when the message is empty', () => {
      const result = employeesReducer(initial(), actions.createEmployeeFailure({ message: '', fieldErrors: { commissionRate: 'Out of range' } }))
      expect(result.saveError).toBeNull()
      expect(result.fieldErrors).toEqual({ commissionRate: 'Out of range' })
    })

    it('RESET_SAVE returns the save fields to idle', () => {
      const state = frozen({ ...initialEmployeesState, saveStatus: 'error', saveError: 'x', fieldErrors: { salary: 'too low' } })
      expect(employeesReducer(state, actions.resetEmployeeSave())).toEqual(initialEmployeesState)
    })
  })
})
