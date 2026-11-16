import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/receipts/receipts.actions'
import { RECEIPT_ACTIONS } from '../../../redux/receipts/receipts.constants'
import { receiptBankAccountOptions, receiptFormValues } from '../../../test/fixtures/receipts'

const request = { arInvoiceId: '2471', values: receiptFormValues }
const saveError = { message: '', fieldErrors: { amount: 'Too much' } }

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
  ])('%s', (_, action, expected) => {
    expect(action).toEqual(expected)
  })
})
