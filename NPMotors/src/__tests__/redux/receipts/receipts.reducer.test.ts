import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/receipts/receipts.actions'
import receiptsReducer, { initialReceiptsState, type ReceiptsState } from '../../../redux/receipts/receipts.reducer'
import { receiptBankAccountOptions, receiptFormValues, receiptPayments } from '../../../test/fixtures/receipts'

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

  describe('payment history', () => {
    const loaded: ReceiptsState = {
      ...initialReceiptsState,
      paymentHistoryInvoiceId: '2471',
      payments: receiptPayments,
      paymentHistoryStatus: 'success',
    }

    it('LOAD_PAYMENT_HISTORY for the same invoice keeps its payments while reloading', () => {
      const state = receiptsReducer({ ...loaded, paymentHistoryError: 'old' }, actions.loadPaymentHistory('2471'))
      expect(state).toMatchObject({ paymentHistoryInvoiceId: '2471', payments: receiptPayments, paymentHistoryStatus: 'loading', paymentHistoryError: null })
    })

    it('LOAD_PAYMENT_HISTORY for another invoice starts empty', () => {
      const state = receiptsReducer(loaded, actions.loadPaymentHistory('3975'))
      expect(state).toMatchObject({ paymentHistoryInvoiceId: '3975', payments: [], paymentHistoryStatus: 'loading' })
    })

    it('LOAD_PAYMENT_HISTORY_SUCCESS stores the payments of the invoice being loaded', () => {
      const loading = receiptsReducer(initialReceiptsState, actions.loadPaymentHistory('2471'))
      const state = receiptsReducer(loading, actions.loadPaymentHistorySuccess({ arInvoiceId: '2471', payments: receiptPayments }))
      expect(state).toMatchObject({ payments: receiptPayments, paymentHistoryStatus: 'success' })
    })

    it('LOAD_PAYMENT_HISTORY_SUCCESS ignores a late answer for another invoice', () => {
      const loading = receiptsReducer(initialReceiptsState, actions.loadPaymentHistory('3975'))
      expect(receiptsReducer(loading, actions.loadPaymentHistorySuccess({ arInvoiceId: '2471', payments: receiptPayments }))).toBe(loading)
    })

    it('LOAD_PAYMENT_HISTORY_FAILURE stores the message', () => {
      const state = receiptsReducer(loaded, actions.loadPaymentHistoryFailure('Payment history could not be loaded.'))
      expect(state).toMatchObject({ paymentHistoryStatus: 'error', paymentHistoryError: 'Payment history could not be loaded.' })
    })

    it('CLEAR_PAYMENT_HISTORY forgets the invoice and its payments, leaving the save alone', () => {
      const state = receiptsReducer({ ...failed, ...loaded, saveStatus: 'error' }, actions.clearPaymentHistory())
      expect(state).toMatchObject({ paymentHistoryInvoiceId: null, payments: [], paymentHistoryStatus: 'idle', paymentHistoryError: null, saveStatus: 'error' })
    })
  })

  describe('sales invoice payments', () => {
    const lookup = { salesInvoiceId: '3', customerId: 'C001', invoiceNumber: 'INV-2026-0003' }
    const loaded: ReceiptsState = {
      ...initialReceiptsState,
      salesInvoicePaymentsId: '3',
      salesInvoicePayments: receiptPayments,
      salesInvoicePaymentsStatus: 'success',
    }

    it('LOAD_SALES_INVOICE_PAYMENTS for the same invoice keeps its payments while reloading', () => {
      const state = receiptsReducer({ ...loaded, salesInvoicePaymentsError: 'old' }, actions.loadSalesInvoicePayments(lookup))
      expect(state).toMatchObject({ salesInvoicePaymentsId: '3', salesInvoicePayments: receiptPayments, salesInvoicePaymentsStatus: 'loading', salesInvoicePaymentsError: null })
    })

    it('LOAD_SALES_INVOICE_PAYMENTS for another invoice starts empty', () => {
      const state = receiptsReducer(loaded, actions.loadSalesInvoicePayments({ ...lookup, salesInvoiceId: '4' }))
      expect(state).toMatchObject({ salesInvoicePaymentsId: '4', salesInvoicePayments: [], salesInvoicePaymentsStatus: 'loading' })
    })

    it('LOAD_SALES_INVOICE_PAYMENTS_SUCCESS stores the payments, and ignores a late answer for another invoice', () => {
      const loading = receiptsReducer(initialReceiptsState, actions.loadSalesInvoicePayments(lookup))
      expect(receiptsReducer(loading, actions.loadSalesInvoicePaymentsSuccess({ salesInvoiceId: '3', payments: receiptPayments })))
        .toMatchObject({ salesInvoicePayments: receiptPayments, salesInvoicePaymentsStatus: 'success' })
      expect(receiptsReducer(loading, actions.loadSalesInvoicePaymentsSuccess({ salesInvoiceId: '9', payments: receiptPayments }))).toBe(loading)
    })

    it('LOAD_SALES_INVOICE_PAYMENTS_FAILURE stores the message', () => {
      expect(receiptsReducer(loaded, actions.loadSalesInvoicePaymentsFailure('nope')))
        .toMatchObject({ salesInvoicePaymentsStatus: 'error', salesInvoicePaymentsError: 'nope' })
    })

    it('CLEAR_SALES_INVOICE_PAYMENTS forgets them without touching the AR payment history', () => {
      const state = receiptsReducer({ ...loaded, paymentHistoryInvoiceId: '2471', payments: receiptPayments }, actions.clearSalesInvoicePayments())
      expect(state).toMatchObject({
        salesInvoicePaymentsId: null, salesInvoicePayments: [], salesInvoicePaymentsStatus: 'idle', salesInvoicePaymentsError: null,
        paymentHistoryInvoiceId: '2471', payments: receiptPayments,
      })
    })
  })
})
