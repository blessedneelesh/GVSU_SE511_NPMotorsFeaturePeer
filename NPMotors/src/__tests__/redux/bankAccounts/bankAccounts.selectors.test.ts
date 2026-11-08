import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/bankAccounts/bankAccounts.selectors'
import { makeBankAccountState } from '../../../test/test-utils'
import { bankAccount, bankAccountPage, bankOptions } from '../../../test/fixtures/bankAccounts'

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeBankAccountState({
  items: bankAccountPage.items,
  hasNext: true,
  query: { pageNumber: 2, pageSize: 10, bankId: '1', searchTerm: 'chase' },
  listStatus: 'success',
  listError: 'list error',
  selectedId: '1',
  selected: bankAccount,
  detailStatus: 'error',
  detailError: 'detail error',
  bankOptions,
  bankOptionsStatus: 'error',
  bankOptionsError: 'options error',
  saveStatus: 'loading',
  saveError: 'save error',
  fieldErrors: { name: 'Required' },
})

describe('bankAccounts selectors', () => {
  it('selectBankAccountState returns the slice', () => {
    expect(selectors.selectBankAccountState(state)).toBe(state.bankAccounts)
  })

  it.each([
    ['selectBankAccounts', selectors.selectBankAccounts, bankAccountPage.items],
    ['selectBankAccountHasNext', selectors.selectBankAccountHasNext, true],
    ['selectBankAccountQuery', selectors.selectBankAccountQuery, { pageNumber: 2, pageSize: 10, bankId: '1', searchTerm: 'chase' }],
    ['selectBankAccountListStatus', selectors.selectBankAccountListStatus, 'success'],
    ['selectBankAccountListError', selectors.selectBankAccountListError, 'list error'],
    ['selectSelectedBankAccountId', selectors.selectSelectedBankAccountId, '1'],
    ['selectSelectedBankAccount', selectors.selectSelectedBankAccount, bankAccount],
    ['selectBankAccountDetailStatus', selectors.selectBankAccountDetailStatus, 'error'],
    ['selectBankAccountDetailError', selectors.selectBankAccountDetailError, 'detail error'],
    ['selectBankOptions', selectors.selectBankOptions, bankOptions],
    ['selectBankOptionsStatus', selectors.selectBankOptionsStatus, 'error'],
    ['selectBankOptionsError', selectors.selectBankOptionsError, 'options error'],
    ['selectBankAccountSaveStatus', selectors.selectBankAccountSaveStatus, 'loading'],
    ['selectBankAccountSaveError', selectors.selectBankAccountSaveError, 'save error'],
    ['selectBankAccountFieldErrors', selectors.selectBankAccountFieldErrors, { name: 'Required' }],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectBankAccounts(state)).toBe(selectors.selectBankAccounts(state))
      expect(selectors.selectBankAccountQuery(state)).toBe(selectors.selectBankAccountQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectBankAccounts(state)
      const next = { ...state, bankAccounts: { ...state.bankAccounts, listStatus: 'loading' as const } }
      expect(selectors.selectBankAccounts(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, bankAccounts: { ...state.bankAccounts, items: [bankAccount] } }
      expect(selectors.selectBankAccounts(next)).toEqual([bankAccount])
    })
  })
})
