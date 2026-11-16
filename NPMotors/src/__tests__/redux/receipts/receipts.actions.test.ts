import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/receipts/receipts.actions'
import { RECEIPT_ACTIONS } from '../../../redux/receipts/receipts.constants'
import { receiptBankAccountOptions, receiptFormValues, receiptPayments } from '../../../test/fixtures/receipts'

const request = { arInvoiceId: '2471', values: receiptFormValues }
const saveError = { message: '', fieldErrors: { amount: 'Too much' } }
const history = { arInvoiceId: '2471', payments: receiptPayments }
const lookup = { salesInvoiceId: '3', customerId: 'C001', invoiceNumber: 'INV-2026-0003' }
const salesInvoicePayments = { salesInvoiceId: '3', payments: receiptPayments }

describe('receipts actions', () => {
  it.each([
    ['loadReceiptBankAccountOptions', actions.loadReceiptBankAccountOptions(), { type: RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS }],
    ['loadReceiptBankAccountOptionsSuccess', actions.loadReceiptBankAccountOptionsSuccess(receiptBankAccountOptions),
      { type: RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_SUCCESS, payload: receiptBankAccountOptions }],
    ['loadReceiptBankAccountOptionsFailure', actions.loadReceiptBankAccountOptionsFailure('nope'),
      { type: RECEIPT_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_FAILURE, payload: 'nope' }],
    ['recordArPayment', actions.recordArPayment(request), { type: RECEIPT_ACTIONS.RECORD_AR_PAYMENT, payload: request }],
    ['recordArPaymentSuccess', actions.recordArPaymentSuccess(), { type: RECEIPT_ACTIONS.RECORD_AR_PAYMENT_SUCCESS }],
    ['recordArPaymentFailure', actions.recordArPaymentFailure(saveError), { type: RECEIPT_ACTIONS.RECORD_AR_PAYMENT_FAILURE, payload: saveError }],
    ['resetReceiptSave', actions.resetReceiptSave(), { type: RECEIPT_ACTIONS.RESET_SAVE }],
    ['loadPaymentHistory', actions.loadPaymentHistory('2471'), { type: RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY, payload: '2471' }],
    ['loadPaymentHistorySuccess', actions.loadPaymentHistorySuccess(history), { type: RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY_SUCCESS, payload: history }],
    ['loadPaymentHistoryFailure', actions.loadPaymentHistoryFailure('nope'), { type: RECEIPT_ACTIONS.LOAD_PAYMENT_HISTORY_FAILURE, payload: 'nope' }],
    ['clearPaymentHistory', actions.clearPaymentHistory(), { type: RECEIPT_ACTIONS.CLEAR_PAYMENT_HISTORY }],
    ['loadSalesInvoicePayments', actions.loadSalesInvoicePayments(lookup), { type: RECEIPT_ACTIONS.LOAD_SALES_INVOICE_PAYMENTS, payload: lookup }],
    ['loadSalesInvoicePaymentsSuccess', actions.loadSalesInvoicePaymentsSuccess(salesInvoicePayments),
      { type: RECEIPT_ACTIONS.LOAD_SALES_INVOICE_PAYMENTS_SUCCESS, payload: salesInvoicePayments }],
    ['loadSalesInvoicePaymentsFailure', actions.loadSalesInvoicePaymentsFailure('nope'), { type: RECEIPT_ACTIONS.LOAD_SALES_INVOICE_PAYMENTS_FAILURE, payload: 'nope' }],
    ['clearSalesInvoicePayments', actions.clearSalesInvoicePayments(), { type: RECEIPT_ACTIONS.CLEAR_SALES_INVOICE_PAYMENTS }],
  ])('%s', (_, action, expected) => {
    expect(action).toEqual(expected)
  })
})
