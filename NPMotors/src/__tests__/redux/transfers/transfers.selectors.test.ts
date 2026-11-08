import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/transfers/transfers.selectors'
import { makeTransferState } from '../../../test/test-utils'
import { accountOptions } from '../../../test/fixtures/transfers'

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeTransferState({
  accountOptions,
  accountOptionsStatus: 'error',
  accountOptionsError: 'options error',
  saveStatus: 'loading',
  saveError: 'save error',
  fieldErrors: { amount: 'Required' },
})

describe('transfers selectors', () => {
  it('selectTransferState returns the slice', () => {
    expect(selectors.selectTransferState(state)).toBe(state.transfers)
  })

  it.each([
    ['selectTransferAccountOptions', selectors.selectTransferAccountOptions, accountOptions],
    ['selectTransferAccountOptionsStatus', selectors.selectTransferAccountOptionsStatus, 'error'],
    ['selectTransferAccountOptionsError', selectors.selectTransferAccountOptionsError, 'options error'],
    ['selectTransferSaveStatus', selectors.selectTransferSaveStatus, 'loading'],
    ['selectTransferSaveError', selectors.selectTransferSaveError, 'save error'],
    ['selectTransferFieldErrors', selectors.selectTransferFieldErrors, { amount: 'Required' }],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectTransferAccountOptions(state)).toBe(selectors.selectTransferAccountOptions(state))
      expect(selectors.selectTransferFieldErrors(state)).toBe(selectors.selectTransferFieldErrors(state))
    })

    it('keeps the options reference when another key in the slice changes', () => {
      const before = selectors.selectTransferAccountOptions(state)
      const next = { ...state, transfers: { ...state.transfers, saveStatus: 'success' as const } }
      expect(selectors.selectTransferAccountOptions(next)).toBe(before)
    })

    it('returns the new options when they change', () => {
      const next = { ...state, transfers: { ...state.transfers, accountOptions: accountOptions.slice(0, 1) } }
      expect(selectors.selectTransferAccountOptions(next)).toEqual(accountOptions.slice(0, 1))
    })
  })
})
