import { describe, expect, it } from 'vitest'
import { STATEMENT_LINE_ACTIONS } from '../../../redux/statementLines/statementLines.constants'

describe('STATEMENT_LINE_ACTIONS', () => {
  it.each([
    ['LOAD', 'statementLines/load'],
    ['LOAD_SUCCESS', 'statementLines/loadSuccess'],
    ['LOAD_FAILURE', 'statementLines/loadFailure'],
    ['SET_BANK_ACCOUNT_FILTER', 'statementLines/setBankAccountFilter'],
    ['SET_MONTH_FILTER', 'statementLines/setMonthFilter'],
    ['SET_TYPE_FILTER', 'statementLines/setTypeFilter'],
    ['RESET_FILTERS', 'statementLines/resetFilters'],
    ['SET_PAGE', 'statementLines/setPage'],
    ['SET_PAGE_SIZE', 'statementLines/setPageSize'],
    ['LOAD_ACCOUNT_OPTIONS', 'statementLines/loadAccountOptions'],
    ['LOAD_ACCOUNT_OPTIONS_SUCCESS', 'statementLines/loadAccountOptionsSuccess'],
    ['LOAD_ACCOUNT_OPTIONS_FAILURE', 'statementLines/loadAccountOptionsFailure'],
  ] as const)('%s equals %s', (key, value) => {
    expect(STATEMENT_LINE_ACTIONS[key]).toBe(value)
  })

  it('has 12 action types', () => {
    expect(Object.keys(STATEMENT_LINE_ACTIONS)).toHaveLength(12)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(STATEMENT_LINE_ACTIONS)).size).toBe(Object.keys(STATEMENT_LINE_ACTIONS).length)
  })

  it('prefixes every value with statementLines/', () => {
    for (const value of Object.values(STATEMENT_LINE_ACTIONS)) expect(value).toMatch(/^statementLines\//)
  })
})
