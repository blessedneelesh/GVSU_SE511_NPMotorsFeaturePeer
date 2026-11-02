import { describe, expect, it } from 'vitest'
import { CUSTOMER_ACTIONS } from '../../../redux/customers/customers.constants'
import { VENDOR_ACTIONS } from '../../../redux/vendors/vendors.constants'

describe('VENDOR_ACTIONS', () => {
  it.each([
    ['LOAD', 'vendors/load'],
    ['LOAD_SUCCESS', 'vendors/loadSuccess'],
    ['LOAD_FAILURE', 'vendors/loadFailure'],
    ['SET_SEARCH', 'vendors/setSearch'],
    ['SET_TYPE_FILTER', 'vendors/setTypeFilter'],
    ['SET_PAGE', 'vendors/setPage'],
    ['SET_PAGE_SIZE', 'vendors/setPageSize'],
    ['SELECT', 'vendors/select'],
    ['CLEAR_SELECTION', 'vendors/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'vendors/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'vendors/loadByIdFailure'],
    ['CREATE', 'vendors/create'],
    ['CREATE_SUCCESS', 'vendors/createSuccess'],
    ['CREATE_FAILURE', 'vendors/createFailure'],
    ['RESET_SAVE', 'vendors/resetSave'],
  ] as const)('%s equals %s', (key, value) => {
    expect(VENDOR_ACTIONS[key]).toBe(value)
  })

  it('has 15 action types', () => {
    expect(Object.keys(VENDOR_ACTIONS)).toHaveLength(15)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(VENDOR_ACTIONS)).size).toBe(Object.keys(VENDOR_ACTIONS).length)
  })

  it('prefixes every value with vendors/', () => {
    for (const value of Object.values(VENDOR_ACTIONS)) expect(value).toMatch(/^vendors\//)
  })

  // Each reducer's type guard is a Set of its own types, so a shared string would make both slices react
  it('shares no type string with the customers slice', () => {
    const customerTypes = new Set<string>(Object.values(CUSTOMER_ACTIONS))
    for (const value of Object.values(VENDOR_ACTIONS)) expect(customerTypes.has(value)).toBe(false)
  })
})
