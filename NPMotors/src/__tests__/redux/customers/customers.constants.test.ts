import { describe, expect, it } from 'vitest'
import { CUSTOMER_ACTIONS } from '../../../redux/customers/customers.constants'

describe('CUSTOMER_ACTIONS', () => {
  it.each([
    ['LOAD', 'customers/load'],
    ['LOAD_SUCCESS', 'customers/loadSuccess'],
    ['LOAD_FAILURE', 'customers/loadFailure'],
    ['SET_SEARCH', 'customers/setSearch'],
    ['SET_STATUS_FILTER', 'customers/setStatusFilter'],
    ['SET_PAGE', 'customers/setPage'],
    ['SET_PAGE_SIZE', 'customers/setPageSize'],
    ['SELECT', 'customers/select'],
    ['CLEAR_SELECTION', 'customers/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'customers/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'customers/loadByIdFailure'],
    ['CREATE', 'customers/create'],
    ['CREATE_SUCCESS', 'customers/createSuccess'],
    ['CREATE_FAILURE', 'customers/createFailure'],
    ['RESET_SAVE', 'customers/resetSave'],
  ] as const)('%s equals %s', (key, value) => {
    expect(CUSTOMER_ACTIONS[key]).toBe(value)
  })

  it('has 15 action types', () => {
    expect(Object.keys(CUSTOMER_ACTIONS)).toHaveLength(15)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(CUSTOMER_ACTIONS)).size).toBe(Object.keys(CUSTOMER_ACTIONS).length)
  })

  it('prefixes every value with customers/', () => {
    for (const value of Object.values(CUSTOMER_ACTIONS)) expect(value).toMatch(/^customers\//)
  })
})
