import { describe, expect, it } from 'vitest'
import { CUSTOMER_ACTIONS } from '../../../redux/customers/customers.constants'
import { EMPLOYEE_ACTIONS } from '../../../redux/employees/employees.constants'
import { VEHICLE_ACTIONS } from '../../../redux/vehicles/vehicles.constants'
import { VENDOR_ACTIONS } from '../../../redux/vendors/vendors.constants'

describe('VEHICLE_ACTIONS', () => {
  it.each([
    ['LOAD', 'vehicles/load'],
    ['LOAD_SUCCESS', 'vehicles/loadSuccess'],
    ['LOAD_FAILURE', 'vehicles/loadFailure'],
    ['SET_SEARCH', 'vehicles/setSearch'],
    ['SET_STATUS_FILTER', 'vehicles/setStatusFilter'],
    ['SET_PAGE', 'vehicles/setPage'],
    ['SET_PAGE_SIZE', 'vehicles/setPageSize'],
    ['SELECT', 'vehicles/select'],
    ['CLEAR_SELECTION', 'vehicles/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'vehicles/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'vehicles/loadByIdFailure'],
    ['LOAD_VENDOR_OPTIONS', 'vehicles/loadVendorOptions'],
    ['LOAD_VENDOR_OPTIONS_SUCCESS', 'vehicles/loadVendorOptionsSuccess'],
    ['LOAD_VENDOR_OPTIONS_FAILURE', 'vehicles/loadVendorOptionsFailure'],
    ['CREATE', 'vehicles/create'],
    ['CREATE_SUCCESS', 'vehicles/createSuccess'],
    ['CREATE_FAILURE', 'vehicles/createFailure'],
    ['RESET_SAVE', 'vehicles/resetSave'],
  ] as const)('%s equals %s', (key, value) => {
    expect(VEHICLE_ACTIONS[key]).toBe(value)
  })

  it('has 18 action types', () => {
    expect(Object.keys(VEHICLE_ACTIONS)).toHaveLength(18)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(VEHICLE_ACTIONS)).size).toBe(Object.keys(VEHICLE_ACTIONS).length)
  })

  it('prefixes every value with vehicles/', () => {
    for (const value of Object.values(VEHICLE_ACTIONS)) expect(value).toMatch(/^vehicles\//)
  })

  // Each reducer's type guard is a Set of its own types, so a shared string would make two slices react
  it('shares no type string with the customers, vendors or employees slices', () => {
    const otherTypes = new Set<string>([
      ...Object.values(CUSTOMER_ACTIONS),
      ...Object.values(VENDOR_ACTIONS),
      ...Object.values(EMPLOYEE_ACTIONS),
    ])
    for (const value of Object.values(VEHICLE_ACTIONS)) expect(otherTypes.has(value)).toBe(false)
  })
})
