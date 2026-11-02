import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/employees/employees.selectors'
import { makeEmployeeState } from '../../../test/test-utils'
import { employee, employeePage } from '../../../test/fixtures/employees'

const query = { pageNumber: 2, pageSize: 10, department: 'Sales', status: 'inactive', searchTerm: 'lopez' } as const

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeEmployeeState({
  items: employeePage.items,
  hasNext: true,
  query,
  listStatus: 'success',
  listError: 'list error',
  selectedId: '12',
  selected: employee,
  detailStatus: 'error',
  detailError: 'detail error',
  saveStatus: 'loading',
  saveError: 'save error',
  fieldErrors: { firstName: 'The First_Name field is required.' },
})

describe('employees selectors', () => {
  it('selectEmployeeState returns the slice', () => {
    expect(selectors.selectEmployeeState(state)).toBe(state.employees)
  })

  it.each([
    ['selectEmployees', selectors.selectEmployees, employeePage.items],
    ['selectEmployeeHasNext', selectors.selectEmployeeHasNext, true],
    ['selectEmployeeQuery', selectors.selectEmployeeQuery, query],
    ['selectEmployeeListStatus', selectors.selectEmployeeListStatus, 'success'],
    ['selectEmployeeListError', selectors.selectEmployeeListError, 'list error'],
    ['selectSelectedEmployeeId', selectors.selectSelectedEmployeeId, '12'],
    ['selectSelectedEmployee', selectors.selectSelectedEmployee, employee],
    ['selectEmployeeDetailStatus', selectors.selectEmployeeDetailStatus, 'error'],
    ['selectEmployeeDetailError', selectors.selectEmployeeDetailError, 'detail error'],
    ['selectEmployeeSaveStatus', selectors.selectEmployeeSaveStatus, 'loading'],
    ['selectEmployeeSaveError', selectors.selectEmployeeSaveError, 'save error'],
    ['selectEmployeeFieldErrors', selectors.selectEmployeeFieldErrors, { firstName: 'The First_Name field is required.' }],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectEmployees(state)).toBe(selectors.selectEmployees(state))
      expect(selectors.selectEmployeeQuery(state)).toBe(selectors.selectEmployeeQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectEmployees(state)
      const next = { ...state, employees: { ...state.employees, listStatus: 'loading' as const } }
      expect(selectors.selectEmployees(next)).toBe(before)
    })

    it('keeps the items reference when only another slice changes', () => {
      const before = selectors.selectEmployees(state)
      const next = { ...state, vendors: { ...state.vendors, listStatus: 'loading' as const } }
      expect(selectors.selectEmployees(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, employees: { ...state.employees, items: [employee] } }
      expect(selectors.selectEmployees(next)).toEqual([employee])
    })
  })
})
