import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/transactions/transactions.selectors'
import { makeTransactionState } from '../../../test/test-utils'
import { accountOptions, transaction, transactionPage } from '../../../test/fixtures/transactions'

const query = { pageNumber: 2, pageSize: 10, bankAccountId: '1', direction: 'out', dateFrom: '2026-11-01', dateTo: '2026-11-30' } as const

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeTransactionState({
  items: transactionPage.items,
  hasNext: true,
  query,
  listStatus: 'success',
  listError: 'list error',
  selectedId: '2990',
  selected: transaction,
  detailStatus: 'error',
  detailError: 'detail error',
  accountOptions,
  accountOptionsStatus: 'error',
  accountOptionsError: 'options error',
})

describe('transactions selectors', () => {
  it('selectTransactionState returns the slice', () => {
    expect(selectors.selectTransactionState(state)).toBe(state.transactions)
  })

  it.each([
    ['selectTransactions', selectors.selectTransactions, transactionPage.items],
    ['selectTransactionHasNext', selectors.selectTransactionHasNext, true],
    ['selectTransactionQuery', selectors.selectTransactionQuery, query],
    ['selectTransactionListStatus', selectors.selectTransactionListStatus, 'success'],
    ['selectTransactionListError', selectors.selectTransactionListError, 'list error'],
    ['selectSelectedTransactionId', selectors.selectSelectedTransactionId, '2990'],
    ['selectSelectedTransaction', selectors.selectSelectedTransaction, transaction],
    ['selectTransactionDetailStatus', selectors.selectTransactionDetailStatus, 'error'],
    ['selectTransactionDetailError', selectors.selectTransactionDetailError, 'detail error'],
    ['selectTransactionAccountOptions', selectors.selectTransactionAccountOptions, accountOptions],
    ['selectTransactionAccountOptionsStatus', selectors.selectTransactionAccountOptionsStatus, 'error'],
    ['selectTransactionAccountOptionsError', selectors.selectTransactionAccountOptionsError, 'options error'],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectTransactions(state)).toBe(selectors.selectTransactions(state))
      expect(selectors.selectTransactionQuery(state)).toBe(selectors.selectTransactionQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectTransactions(state)
      const next = { ...state, transactions: { ...state.transactions, listStatus: 'loading' as const } }
      expect(selectors.selectTransactions(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, transactions: { ...state.transactions, items: [transaction] } }
      expect(selectors.selectTransactions(next)).toEqual([transaction])
    })
  })
})
