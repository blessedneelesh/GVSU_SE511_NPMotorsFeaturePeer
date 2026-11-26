import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/receipts/receipts.selectors'
import { makeReceiptState } from '../../../test/test-utils'
import { receiptBankAccountOptions, receiptPayments } from '../../../test/fixtures/receipts'

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeReceiptState({
  bankAccountOptions: receiptBankAccountOptions,
  bankAccountOptionsStatus: 'success',
  bankAccountOptionsError: 'options error',
  saveStatus: 'error',
  saveError: 'save error',
  fieldErrors: { amount: 'Too much' },
  paymentHistoryInvoiceId: '2471',
  payments: receiptPayments,
  paymentHistoryStatus: 'error',
  paymentHistoryError: 'history error',
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
    ['selectReceiptPaymentHistoryInvoiceId', selectors.selectReceiptPaymentHistoryInvoiceId, '2471'],
    ['selectReceiptPayments', selectors.selectReceiptPayments, receiptPayments],
    ['selectReceiptPaymentHistoryStatus', selectors.selectReceiptPaymentHistoryStatus, 'error'],
    ['selectReceiptPaymentHistoryError', selectors.selectReceiptPaymentHistoryError, 'history error'],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })
})
