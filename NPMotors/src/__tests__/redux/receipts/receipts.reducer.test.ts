import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/receipts/receipts.actions'
import receiptsReducer, { initialReceiptsState, type ReceiptsState } from '../../../redux/receipts/receipts.reducer'
import { receiptBankAccountOptions, receiptFormValues } from '../../../test/fixtures/receipts'

// A state after a failed post, so each case can be shown to clear or keep the errors
const failed: ReceiptsState = {
  ...initialReceiptsState,
  bankAccountOptions: receiptBankAccountOptions,
  bankAccountOptionsStatus: 'success',
  saveStatus: 'error',
  saveError: 'old error',
  fieldErrors: { amount: 'old field error' },
}

describe('receiptsReducer', () => {
  it('returns the initial state', () => {
    expect(receiptsReducer(undefined, { type: '@@INIT' })).toEqual(initialReceiptsState)
  })

  it('ignores actions from other slices', () => {
    expect(receiptsReducer(failed, { type: 'receivables/load' })).toBe(failed)
  })

  describe('bank account options', () => {
    it('LOAD_BANK_ACCOUNT_OPTIONS sets loading and clears the error', () => {
      const state = receiptsReducer({ ...failed, bankAccountOptionsError: 'old' }, actions.loadReceiptBankAccountOptions())
      expect(state).toMatchObject({ bankAccountOptionsStatus: 'loading', bankAccountOptionsError: null, bankAccountOptions: receiptBankAccountOptions })
    })

    it('LOAD_BANK_ACCOUNT_OPTIONS_SUCCESS stores the options', () => {
      const state = receiptsReducer(initialReceiptsState, actions.loadReceiptBankAccountOptionsSuccess(receiptBankAccountOptions))
      expect(state).toMatchObject({ bankAccountOptions: receiptBankAccountOptions, bankAccountOptionsStatus: 'success' })
    })

    it('LOAD_BANK_ACCOUNT_OPTIONS_FAILURE stores the message and leaves the save alone', () => {
      const state = receiptsReducer(failed, actions.loadReceiptBankAccountOptionsFailure('nope'))
      expect(state).toMatchObject({ bankAccountOptionsStatus: 'error', bankAccountOptionsError: 'nope', saveError: 'old error' })
    })
  })

  describe('recording a payment', () => {
    it('RECORD_AR_PAYMENT sets saving and clears the previous errors', () => {
      const state = receiptsReducer(failed, actions.recordArPayment({ arInvoiceId: '2471', values: receiptFormValues }))
      expect(state).toMatchObject({ saveStatus: 'loading', saveError: null, fieldErrors: {} })
    })

    it('RECORD_AR_PAYMENT_SUCCESS marks the save done', () => {
      expect(receiptsReducer({ ...initialReceiptsState, saveStatus: 'loading' }, actions.recordArPaymentSuccess()).saveStatus).toBe('success')
    })

    it('RECORD_AR_PAYMENT_FAILURE stores the banner message and field errors', () => {
      const state = receiptsReducer(initialReceiptsState, actions.recordArPaymentFailure({ message: 'Invoice is already paid', fieldErrors: {} }))
      expect(state).toMatchObject({ saveStatus: 'error', saveError: 'Invoice is already paid', fieldErrors: {} })
    })

    it('RECORD_AR_PAYMENT_FAILURE with only field errors has no banner message', () => {
      const state = receiptsReducer(initialReceiptsState, actions.recordArPaymentFailure({ message: '', fieldErrors: { amount: 'Too much' } }))
      expect(state).toMatchObject({ saveStatus: 'error', saveError: null, fieldErrors: { amount: 'Too much' } })
    })

    it('RESET_SAVE clears the status and errors but keeps the accounts', () => {
      const state = receiptsReducer(failed, actions.resetReceiptSave())
      expect(state).toEqual({ ...failed, saveStatus: 'idle', saveError: null, fieldErrors: {} })
    })
  })
})
