import { describe, expect, it } from 'vitest'
import { RECEIVABLE_ACTIONS } from '../../../redux/receivables/receivables.constants'

describe('RECEIVABLE_ACTIONS', () => {
  it.each([
    ['LOAD', 'receivables/load'],
    ['LOAD_SUCCESS', 'receivables/loadSuccess'],
    ['LOAD_FAILURE', 'receivables/loadFailure'],
    ['SET_STATUS_FILTER', 'receivables/setStatusFilter'],
    ['SET_CUSTOMER_FILTER', 'receivables/setCustomerFilter'],
    ['SET_AS_OF_DATE', 'receivables/setAsOfDate'],
    ['RESET_FILTERS', 'receivables/resetFilters'],
    ['SET_PAGE', 'receivables/setPage'],
    ['SET_PAGE_SIZE', 'receivables/setPageSize'],
    ['SELECT', 'receivables/select'],
    ['CLEAR_SELECTION', 'receivables/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'receivables/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'receivables/loadByIdFailure'],
    ['LOAD_CUSTOMER_OPTIONS', 'receivables/loadCustomerOptions'],
    ['LOAD_CUSTOMER_OPTIONS_SUCCESS', 'receivables/loadCustomerOptionsSuccess'],
    ['LOAD_CUSTOMER_OPTIONS_FAILURE', 'receivables/loadCustomerOptionsFailure'],
  ] as const)('%s equals %s', (key, value) => {
    expect(RECEIVABLE_ACTIONS[key]).toBe(value)
  })

  it('has 16 action types', () => {
    expect(Object.keys(RECEIVABLE_ACTIONS)).toHaveLength(16)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(RECEIVABLE_ACTIONS)).size).toBe(Object.keys(RECEIVABLE_ACTIONS).length)
  })

  it('prefixes every value with receivables/', () => {
    for (const value of Object.values(RECEIVABLE_ACTIONS)) expect(value).toMatch(/^receivables\//)
  })
})
