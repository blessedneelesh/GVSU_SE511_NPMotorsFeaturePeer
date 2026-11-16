import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/receipts/receipts.selectors'
import { makeReceiptState } from '../../../test/test-utils'
import { receiptBankAccountOptions } from '../../../test/fixtures/receipts'

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeReceiptState({
  bankAccountOptions: receiptBankAccountOptions,
  bankAccountOptionsStatus: 'success',
  bankAccountOptionsError: 'options error',
  saveStatus: 'error',
  saveError: 'save error',
  fieldErrors: { amount: 'Too much' },
})

describe('receipts selectors', () => {
  it('selectReceiptState returns the slice', () => {
    expect(selectors.selectReceiptState(state)).toBe(state.receipts)
  })

  it.each([
    ['selectReceiptBankAccountOptions', selectors.selectReceiptBankAccountOptions, receiptBankAccountOptions],
    ['selectReceiptBankAccountOptionsStatus', selectors.selectReceiptBankAccountOptionsStatus, 'success'],
    ['selectReceiptBankAccountOptionsError', selectors.selectReceiptBankAccountOptionsError, 'options error'],
    ['selectReceiptSaveStatus', selectors.selectReceiptSaveStatus, 'error'],
    ['selectReceiptSaveError', selectors.selectReceiptSaveError, 'save error'],
    ['selectReceiptFieldErrors', selectors.selectReceiptFieldErrors, { amount: 'Too much' }],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })
})
