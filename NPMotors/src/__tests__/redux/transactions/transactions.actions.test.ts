import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/transactions/transactions.actions'
import { TRANSACTION_ACTIONS } from '../../../redux/transactions/transactions.constants'
import { accountOptions, transaction, transactionPage } from '../../../test/fixtures/transactions'

describe('transactions actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadTransactions', actions.loadTransactions, TRANSACTION_ACTIONS.LOAD],
      ['resetTransactionFilters', actions.resetTransactionFilters, TRANSACTION_ACTIONS.RESET_FILTERS],
      ['clearTransactionSelection', actions.clearTransactionSelection, TRANSACTION_ACTIONS.CLEAR_SELECTION],
      ['loadTransactionAccountOptions', actions.loadTransactionAccountOptions, TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadTransactionsSuccess carries the page', () => {
    expect(actions.loadTransactionsSuccess(transactionPage)).toEqual({ type: TRANSACTION_ACTIONS.LOAD_SUCCESS, payload: transactionPage })
  })

  it('loadTransactionsFailure carries the message', () => {
    expect(actions.loadTransactionsFailure('Network error')).toEqual({ type: TRANSACTION_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setTransactionBankAccountFilter carries the account id', () => {
    expect(actions.setTransactionBankAccountFilter('4')).toEqual({ type: TRANSACTION_ACTIONS.SET_BANK_ACCOUNT_FILTER, payload: '4' })
  })

  it('setTransactionDirectionFilter carries the direction', () => {
    expect(actions.setTransactionDirectionFilter('out')).toEqual({ type: TRANSACTION_ACTIONS.SET_DIRECTION_FILTER, payload: 'out' })
  })

  it('setTransactionDateFrom carries the date', () => {
    expect(actions.setTransactionDateFrom('2026-11-01')).toEqual({ type: TRANSACTION_ACTIONS.SET_DATE_FROM, payload: '2026-11-01' })
  })

  it('setTransactionDateTo carries the date', () => {
    expect(actions.setTransactionDateTo('2026-11-30')).toEqual({ type: TRANSACTION_ACTIONS.SET_DATE_TO, payload: '2026-11-30' })
  })

  it('setTransactionPage carries the page number', () => {
    expect(actions.setTransactionPage(3)).toEqual({ type: TRANSACTION_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setTransactionPageSize carries the page size', () => {
    expect(actions.setTransactionPageSize(25)).toEqual({ type: TRANSACTION_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('selectTransaction carries the id', () => {
    expect(actions.selectTransaction('2990')).toEqual({ type: TRANSACTION_ACTIONS.SELECT, payload: '2990' })
  })

  it('loadTransactionByIdSuccess carries the transaction', () => {
    expect(actions.loadTransactionByIdSuccess(transaction)).toEqual({ type: TRANSACTION_ACTIONS.LOAD_BY_ID_SUCCESS, payload: transaction })
  })

  it('loadTransactionByIdFailure carries the message', () => {
    expect(actions.loadTransactionByIdFailure('Not found')).toEqual({ type: TRANSACTION_ACTIONS.LOAD_BY_ID_FAILURE, payload: 'Not found' })
  })

  it('loadTransactionAccountOptionsSuccess carries the options', () => {
    expect(actions.loadTransactionAccountOptionsSuccess(accountOptions)).toEqual({ type: TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS, payload: accountOptions })
  })

  it('loadTransactionAccountOptionsFailure carries the message', () => {
    expect(actions.loadTransactionAccountOptionsFailure('Down')).toEqual({ type: TRANSACTION_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE, payload: 'Down' })
  })
})
