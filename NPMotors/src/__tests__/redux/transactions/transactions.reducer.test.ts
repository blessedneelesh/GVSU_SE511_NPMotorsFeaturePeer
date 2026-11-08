import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/transactions/transactions.actions'
import transactionsReducer, { initialTransactionsState, type TransactionsState } from '../../../redux/transactions/transactions.reducer'
import { accountOptions, transaction, transactionPage } from '../../../test/fixtures/transactions'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: TransactionsState): TransactionsState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.accountOptions)
  return Object.freeze(state)
}

const initial = () => frozen({
  ...initialTransactionsState,
  query: { ...initialTransactionsState.query },
  items: [],
  accountOptions: [],
})

describe('transactionsReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(transactionsReducer(undefined, { type: '@@INIT' })).toEqual(initialTransactionsState)
  })

  it('starts on page 1 of 5 with no filters', () => {
    expect(initialTransactionsState.query).toEqual({ pageNumber: 1, pageSize: 5, bankAccountId: 'all', direction: 'all', dateFrom: '', dateTo: '' })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(transactionsReducer(state, { type: 'other/action' })).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialTransactionsState, listError: 'old error' })
      expect(transactionsReducer(state, actions.loadTransactions())).toEqual({ ...initialTransactionsState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(transactionsReducer(initial(), actions.loadTransactionsSuccess(transactionPage))).toEqual({
        ...initialTransactionsState,
        items: transactionPage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(transactionsReducer(initial(), actions.loadTransactionsFailure('Network error'))).toEqual({
        ...initialTransactionsState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialTransactionsState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialTransactionsState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it.each([
      ['SET_BANK_ACCOUNT_FILTER', actions.setTransactionBankAccountFilter('4'), { bankAccountId: '4' }],
      ['SET_DIRECTION_FILTER', actions.setTransactionDirectionFilter('out'), { direction: 'out' }],
      ['SET_DATE_FROM', actions.setTransactionDateFrom('2026-11-01'), { dateFrom: '2026-11-01' }],
      ['SET_DATE_TO', actions.setTransactionDateTo('2026-11-30'), { dateTo: '2026-11-30' }],
      ['SET_PAGE_SIZE', actions.setTransactionPageSize(25), { pageSize: 25 }],
    ] as const)('%s sets its field and resets to page 1', (_, action, change) => {
      expect(transactionsReducer(onPage3(), action)).toEqual({
        ...initialTransactionsState,
        ...reloading,
        query: { ...initialTransactionsState.query, ...change, pageNumber: 1 },
      })
    })

    it('SET_DATE_FROM with an empty string clears the bound', () => {
      const state = frozen({ ...initialTransactionsState, query: { ...initialTransactionsState.query, dateFrom: '2026-11-01' } })
      expect(transactionsReducer(state, actions.setTransactionDateFrom('')).query.dateFrom).toBe('')
    })

    it('RESET_FILTERS clears every filter, keeps the page size and resets to page 1', () => {
      const state = frozen({
        ...initialTransactionsState,
        listStatus: 'error',
        listError: 'old error',
        query: { pageNumber: 3, pageSize: 25, bankAccountId: '4', direction: 'out', dateFrom: '2026-11-01', dateTo: '2026-11-30' },
      })
      expect(transactionsReducer(state, actions.resetTransactionFilters())).toEqual({
        ...initialTransactionsState,
        ...reloading,
        query: { ...initialTransactionsState.query, pageSize: 25 },
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(transactionsReducer(onPage3(), actions.setTransactionPage(4))).toEqual({
        ...initialTransactionsState,
        ...reloading,
        query: { ...initialTransactionsState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(transactionsReducer(onPage3(), actions.setTransactionPage(0)).query.pageNumber).toBe(1)
      expect(transactionsReducer(onPage3(), actions.setTransactionPage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('detail', () => {
    it('SELECT stores the id, clears the previous transaction and starts loading', () => {
      const state = frozen({ ...initialTransactionsState, selected: transaction, detailStatus: 'error', detailError: 'old error' })
      expect(transactionsReducer(state, actions.selectTransaction('2400'))).toEqual({
        ...initialTransactionsState,
        selectedId: '2400',
        selected: null,
        detailStatus: 'loading',
        detailError: null,
      })
    })

    it('LOAD_BY_ID_SUCCESS stores the transaction', () => {
      const state = frozen({ ...initialTransactionsState, selectedId: '2990', detailStatus: 'loading' })
      expect(transactionsReducer(state, actions.loadTransactionByIdSuccess(transaction))).toEqual({
        ...initialTransactionsState,
        selectedId: '2990',
        selected: transaction,
        detailStatus: 'success',
      })
    })

    it('LOAD_BY_ID_FAILURE stores the error', () => {
      const state = frozen({ ...initialTransactionsState, selectedId: '2990', detailStatus: 'loading' })
      expect(transactionsReducer(state, actions.loadTransactionByIdFailure('Not found'))).toEqual({
        ...initialTransactionsState,
        selectedId: '2990',
        detailStatus: 'error',
        detailError: 'Not found',
      })
    })

    it('CLEAR_SELECTION resets every detail field', () => {
      const state = frozen({ ...initialTransactionsState, selectedId: '2990', selected: transaction, detailStatus: 'error', detailError: 'x' })
      expect(transactionsReducer(state, actions.clearTransactionSelection())).toEqual(initialTransactionsState)
    })
  })

  describe('account options', () => {
    it('LOAD_ACCOUNT_OPTIONS starts loading, clears the error and keeps the previous options', () => {
      const state = frozen({ ...initialTransactionsState, accountOptions, accountOptionsStatus: 'error', accountOptionsError: 'old' })
      expect(transactionsReducer(state, actions.loadTransactionAccountOptions())).toEqual({
        ...initialTransactionsState,
        accountOptions,
        accountOptionsStatus: 'loading',
        accountOptionsError: null,
      })
    })

    it('LOAD_ACCOUNT_OPTIONS_SUCCESS stores the options', () => {
      expect(transactionsReducer(initial(), actions.loadTransactionAccountOptionsSuccess(accountOptions))).toEqual({
        ...initialTransactionsState,
        accountOptions,
        accountOptionsStatus: 'success',
      })
    })

    it('LOAD_ACCOUNT_OPTIONS_FAILURE stores the error', () => {
      expect(transactionsReducer(initial(), actions.loadTransactionAccountOptionsFailure('Bank accounts could not be loaded.'))).toEqual({
        ...initialTransactionsState,
        accountOptionsStatus: 'error',
        accountOptionsError: 'Bank accounts could not be loaded.',
      })
    })
  })
})
