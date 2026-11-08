import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/statementLines/statementLines.actions'
import { STATEMENT_LINE_ACTIONS } from '../../../redux/statementLines/statementLines.constants'
import { statementAccountOptions, statementLinePage } from '../../../test/fixtures/statementLines'

describe('statementLines actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadStatementLines', actions.loadStatementLines, STATEMENT_LINE_ACTIONS.LOAD],
      ['resetStatementLineFilters', actions.resetStatementLineFilters, STATEMENT_LINE_ACTIONS.RESET_FILTERS],
      ['loadStatementLineAccountOptions', actions.loadStatementLineAccountOptions, STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadStatementLinesSuccess carries the page', () => {
    expect(actions.loadStatementLinesSuccess(statementLinePage)).toEqual({ type: STATEMENT_LINE_ACTIONS.LOAD_SUCCESS, payload: statementLinePage })
  })

  it('loadStatementLinesFailure carries the message', () => {
    expect(actions.loadStatementLinesFailure('Network error')).toEqual({ type: STATEMENT_LINE_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setStatementLineBankAccountFilter carries the account id', () => {
    expect(actions.setStatementLineBankAccountFilter('4')).toEqual({ type: STATEMENT_LINE_ACTIONS.SET_BANK_ACCOUNT_FILTER, payload: '4' })
  })

  it('setStatementLineMonthFilter carries the month', () => {
    expect(actions.setStatementLineMonthFilter('2024-03')).toEqual({ type: STATEMENT_LINE_ACTIONS.SET_MONTH_FILTER, payload: '2024-03' })
  })

  it('setStatementLineTypeFilter carries the type', () => {
    expect(actions.setStatementLineTypeFilter('Transfer')).toEqual({ type: STATEMENT_LINE_ACTIONS.SET_TYPE_FILTER, payload: 'Transfer' })
  })

  it('setStatementLinePage carries the page number', () => {
    expect(actions.setStatementLinePage(3)).toEqual({ type: STATEMENT_LINE_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setStatementLinePageSize carries the page size', () => {
    expect(actions.setStatementLinePageSize(25)).toEqual({ type: STATEMENT_LINE_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('loadStatementLineAccountOptionsSuccess carries the options', () => {
    expect(actions.loadStatementLineAccountOptionsSuccess(statementAccountOptions)).toEqual({ type: STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS, payload: statementAccountOptions })
  })

  it('loadStatementLineAccountOptionsFailure carries the message', () => {
    expect(actions.loadStatementLineAccountOptionsFailure('Down')).toEqual({ type: STATEMENT_LINE_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE, payload: 'Down' })
  })
})
