import { describe, expect, it } from 'vitest'
import { CUSTOMER_ACTIONS } from '../../../redux/customers/customers.constants'
import { EMPLOYEE_ACTIONS } from '../../../redux/employees/employees.constants'
import { VENDOR_ACTIONS } from '../../../redux/vendors/vendors.constants'

describe('EMPLOYEE_ACTIONS', () => {
  it.each([
    ['LOAD', 'employees/load'],
    ['LOAD_SUCCESS', 'employees/loadSuccess'],
    ['LOAD_FAILURE', 'employees/loadFailure'],
    ['SET_SEARCH', 'employees/setSearch'],
    ['SET_DEPARTMENT_FILTER', 'employees/setDepartmentFilter'],
    ['SET_STATUS_FILTER', 'employees/setStatusFilter'],
    ['SET_PAGE', 'employees/setPage'],
    ['SET_PAGE_SIZE', 'employees/setPageSize'],
    ['SELECT', 'employees/select'],
    ['CLEAR_SELECTION', 'employees/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'employees/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'employees/loadByIdFailure'],
    ['CREATE', 'employees/create'],
    ['CREATE_SUCCESS', 'employees/createSuccess'],
    ['CREATE_FAILURE', 'employees/createFailure'],
    ['RESET_SAVE', 'employees/resetSave'],
  ] as const)('%s equals %s', (key, value) => {
    expect(EMPLOYEE_ACTIONS[key]).toBe(value)
  })

  it('has 16 action types', () => {
    expect(Object.keys(EMPLOYEE_ACTIONS)).toHaveLength(16)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(EMPLOYEE_ACTIONS)).size).toBe(Object.keys(EMPLOYEE_ACTIONS).length)
  })

  it('prefixes every value with employees/', () => {
    for (const value of Object.values(EMPLOYEE_ACTIONS)) expect(value).toMatch(/^employees\//)
  })

  // Each reducer's type guard is a Set of its own types, so a shared string would make two slices react
  it('shares no type string with the customers or vendors slices', () => {
    const otherTypes = new Set<string>([...Object.values(CUSTOMER_ACTIONS), ...Object.values(VENDOR_ACTIONS)])
    for (const value of Object.values(EMPLOYEE_ACTIONS)) expect(otherTypes.has(value)).toBe(false)
  })
})
