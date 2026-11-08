import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/statementLines/statementLines.actions'
import statementLinesReducer, { initialStatementLinesState, type StatementLinesState } from '../../../redux/statementLines/statementLines.reducer'
import { statementAccountOptions, statementLinePage } from '../../../test/fixtures/statementLines'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: StatementLinesState): StatementLinesState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.accountOptions)
  return Object.freeze(state)
}

const initial = () => frozen({
  ...initialStatementLinesState,
  query: { ...initialStatementLinesState.query },
  items: [],
  accountOptions: [],
})

describe('statementLinesReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(statementLinesReducer(undefined, { type: '@@INIT' })).toEqual(initialStatementLinesState)
  })

  it('starts on page 1 of 5 with every account and no filters', () => {
    expect(initialStatementLinesState.query).toEqual({ pageNumber: 1, pageSize: 5, bankAccountId: 'all', month: '', type: 'all' })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(statementLinesReducer(state, { type: 'other/action' })).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialStatementLinesState, listError: 'old error' })
      expect(statementLinesReducer(state, actions.loadStatementLines())).toEqual({ ...initialStatementLinesState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(statementLinesReducer(initial(), actions.loadStatementLinesSuccess(statementLinePage))).toEqual({
        ...initialStatementLinesState,
        items: statementLinePage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(statementLinesReducer(initial(), actions.loadStatementLinesFailure('Network error'))).toEqual({
        ...initialStatementLinesState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialStatementLinesState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialStatementLinesState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it.each([
      ['SET_MONTH_FILTER', actions.setStatementLineMonthFilter('2024-03'), { month: '2024-03' }],
      ['SET_TYPE_FILTER', actions.setStatementLineTypeFilter('Transfer'), { type: 'Transfer' }],
      ['SET_PAGE_SIZE', actions.setStatementLinePageSize(25), { pageSize: 25 }],
    ] as const)('%s sets its field and resets to page 1', (_, action, change) => {
      expect(statementLinesReducer(onPage3(), action)).toEqual({
        ...initialStatementLinesState,
        ...reloading,
        query: { ...initialStatementLinesState.query, ...change, pageNumber: 1 },
      })
    })

    it('SET_MONTH_FILTER with an empty string clears the month', () => {
      const state = frozen({ ...initialStatementLinesState, query: { ...initialStatementLinesState.query, month: '2024-03' } })
      expect(statementLinesReducer(state, actions.setStatementLineMonthFilter('')).query.month).toBe('')
    })

    it('SET_BANK_ACCOUNT_FILTER switches the account, clears the month and type and resets to page 1', () => {
      const state = frozen({
        ...initialStatementLinesState,
        listStatus: 'error',
        listError: 'old error',
        query: { pageNumber: 3, pageSize: 25, bankAccountId: '1', month: '2024-03', type: 'Transfer' },
      })
      expect(statementLinesReducer(state, actions.setStatementLineBankAccountFilter('4'))).toEqual({
        ...initialStatementLinesState,
        ...reloading,
        query: { pageNumber: 1, pageSize: 25, bankAccountId: '4', month: '', type: 'all' },
      })
    })

    it('RESET_FILTERS clears the month and type, keeps the account and page size and resets to page 1', () => {
      const state = frozen({
        ...initialStatementLinesState,
        listStatus: 'error',
        listError: 'old error',
        query: { pageNumber: 3, pageSize: 25, bankAccountId: '1', month: '2024-03', type: 'Transfer' },
      })
      expect(statementLinesReducer(state, actions.resetStatementLineFilters())).toEqual({
        ...initialStatementLinesState,
        ...reloading,
        query: { pageNumber: 1, pageSize: 25, bankAccountId: '1', month: '', type: 'all' },
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(statementLinesReducer(onPage3(), actions.setStatementLinePage(4))).toEqual({
        ...initialStatementLinesState,
        ...reloading,
        query: { ...initialStatementLinesState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(statementLinesReducer(onPage3(), actions.setStatementLinePage(0)).query.pageNumber).toBe(1)
      expect(statementLinesReducer(onPage3(), actions.setStatementLinePage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('account options', () => {
    it('LOAD_ACCOUNT_OPTIONS starts loading, clears the error and keeps the previous options', () => {
      const state = frozen({ ...initialStatementLinesState, accountOptions: statementAccountOptions, accountOptionsStatus: 'error', accountOptionsError: 'old' })
      expect(statementLinesReducer(state, actions.loadStatementLineAccountOptions())).toEqual({
        ...initialStatementLinesState,
        accountOptions: statementAccountOptions,
        accountOptionsStatus: 'loading',
        accountOptionsError: null,
      })
    })

    it('LOAD_ACCOUNT_OPTIONS_SUCCESS stores the options', () => {
      expect(statementLinesReducer(initial(), actions.loadStatementLineAccountOptionsSuccess(statementAccountOptions))).toEqual({
        ...initialStatementLinesState,
        accountOptions: statementAccountOptions,
        accountOptionsStatus: 'success',
      })
    })

    it('LOAD_ACCOUNT_OPTIONS_FAILURE stores the error', () => {
      expect(statementLinesReducer(initial(), actions.loadStatementLineAccountOptionsFailure('Bank accounts could not be loaded.'))).toEqual({
        ...initialStatementLinesState,
        accountOptionsStatus: 'error',
        accountOptionsError: 'Bank accounts could not be loaded.',
      })
    })
  })
})
