import { describe, expect, it } from 'vitest'
import { CUSTOMER_ACTIONS } from '../../../redux/customers/customers.constants'
import { EMPLOYEE_ACTIONS } from '../../../redux/employees/employees.constants'
import { PART_ACTIONS } from '../../../redux/parts/parts.constants'
import { VEHICLE_ACTIONS } from '../../../redux/vehicles/vehicles.constants'
import { VENDOR_ACTIONS } from '../../../redux/vendors/vendors.constants'

describe('PART_ACTIONS', () => {
  it.each([
    ['LOAD', 'parts/load'],
    ['LOAD_SUCCESS', 'parts/loadSuccess'],
    ['LOAD_FAILURE', 'parts/loadFailure'],
    ['SET_SEARCH', 'parts/setSearch'],
    ['SET_CATEGORY_FILTER', 'parts/setCategoryFilter'],
    ['SET_STOCK_FILTER', 'parts/setStockFilter'],
    ['SET_PAGE', 'parts/setPage'],
    ['SET_PAGE_SIZE', 'parts/setPageSize'],
    ['SELECT', 'parts/select'],
    ['CLEAR_SELECTION', 'parts/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'parts/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'parts/loadByIdFailure'],
    ['LOAD_VENDOR_OPTIONS', 'parts/loadVendorOptions'],
    ['LOAD_VENDOR_OPTIONS_SUCCESS', 'parts/loadVendorOptionsSuccess'],
    ['LOAD_VENDOR_OPTIONS_FAILURE', 'parts/loadVendorOptionsFailure'],
    ['LOAD_RECEIVE_OPTIONS', 'parts/loadReceiveOptions'],
    ['LOAD_RECEIVE_OPTIONS_SUCCESS', 'parts/loadReceiveOptionsSuccess'],
    ['LOAD_RECEIVE_OPTIONS_FAILURE', 'parts/loadReceiveOptionsFailure'],
    ['RECEIVE', 'parts/receive'],
    ['RECEIVE_SUCCESS', 'parts/receiveSuccess'],
    ['RECEIVE_FAILURE', 'parts/receiveFailure'],
    ['RESET_SAVE', 'parts/resetSave'],
  ] as const)('%s equals %s', (key, value) => {
    expect(PART_ACTIONS[key]).toBe(value)
  })

  it('has 22 action types', () => {
    expect(Object.keys(PART_ACTIONS)).toHaveLength(22)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(PART_ACTIONS)).size).toBe(Object.keys(PART_ACTIONS).length)
  })

  it('prefixes every value with parts/', () => {
    for (const value of Object.values(PART_ACTIONS)) expect(value).toMatch(/^parts\//)
  })

  // Each reducer's type guard is a Set of its own types, so a shared string would make two slices react
  it('shares no type string with the other slices', () => {
    const otherTypes = new Set<string>([
      ...Object.values(CUSTOMER_ACTIONS),
      ...Object.values(VENDOR_ACTIONS),
      ...Object.values(EMPLOYEE_ACTIONS),
      ...Object.values(VEHICLE_ACTIONS),
    ])
    for (const value of Object.values(PART_ACTIONS)) expect(otherTypes.has(value)).toBe(false)
  })
})
