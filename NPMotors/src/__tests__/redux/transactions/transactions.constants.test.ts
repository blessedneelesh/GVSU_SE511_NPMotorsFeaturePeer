import { describe, expect, it } from 'vitest'
import { TRANSACTION_ACTIONS } from '../../../redux/transactions/transactions.constants'

describe('TRANSACTION_ACTIONS', () => {
  it.each([
    ['LOAD', 'transactions/load'],
    ['LOAD_SUCCESS', 'transactions/loadSuccess'],
    ['LOAD_FAILURE', 'transactions/loadFailure'],
    ['SET_BANK_ACCOUNT_FILTER', 'transactions/setBankAccountFilter'],
    ['SET_DIRECTION_FILTER', 'transactions/setDirectionFilter'],
    ['SET_DATE_FROM', 'transactions/setDateFrom'],
    ['SET_DATE_TO', 'transactions/setDateTo'],
    ['RESET_FILTERS', 'transactions/resetFilters'],
    ['SET_PAGE', 'transactions/setPage'],
    ['SET_PAGE_SIZE', 'transactions/setPageSize'],
    ['SELECT', 'transactions/select'],
    ['CLEAR_SELECTION', 'transactions/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'transactions/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'transactions/loadByIdFailure'],
    ['LOAD_ACCOUNT_OPTIONS', 'transactions/loadAccountOptions'],
    ['LOAD_ACCOUNT_OPTIONS_SUCCESS', 'transactions/loadAccountOptionsSuccess'],
    ['LOAD_ACCOUNT_OPTIONS_FAILURE', 'transactions/loadAccountOptionsFailure'],
  ] as const)('%s equals %s', (key, value) => {
    expect(TRANSACTION_ACTIONS[key]).toBe(value)
  })

  it('has 17 action types', () => {
    expect(Object.keys(TRANSACTION_ACTIONS)).toHaveLength(17)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(TRANSACTION_ACTIONS)).size).toBe(Object.keys(TRANSACTION_ACTIONS).length)
  })

  it('prefixes every value with transactions/', () => {
    for (const value of Object.values(TRANSACTION_ACTIONS)) expect(value).toMatch(/^transactions\//)
  })
})
