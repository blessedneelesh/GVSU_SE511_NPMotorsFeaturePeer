import { describe, expect, it } from 'vitest'
import { RECEIPT_ACTIONS } from '../../../redux/receipts/receipts.constants'

describe('RECEIPT_ACTIONS', () => {
  it.each([
    ['LOAD_BANK_ACCOUNT_OPTIONS', 'receipts/loadBankAccountOptions'],
    ['LOAD_BANK_ACCOUNT_OPTIONS_SUCCESS', 'receipts/loadBankAccountOptionsSuccess'],
    ['LOAD_BANK_ACCOUNT_OPTIONS_FAILURE', 'receipts/loadBankAccountOptionsFailure'],
    ['RECORD_AR_PAYMENT', 'receipts/recordArPayment'],
    ['RECORD_AR_PAYMENT_SUCCESS', 'receipts/recordArPaymentSuccess'],
    ['RECORD_AR_PAYMENT_FAILURE', 'receipts/recordArPaymentFailure'],
    ['RESET_SAVE', 'receipts/resetSave'],
  ] as const)('%s equals %s', (key, value) => {
    expect(RECEIPT_ACTIONS[key]).toBe(value)
  })

  it('has 18 action types', () => {
    expect(Object.keys(RECEIPT_ACTIONS)).toHaveLength(18)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(RECEIPT_ACTIONS)).size).toBe(Object.keys(RECEIPT_ACTIONS).length)
  })

  it('prefixes every value with receipts/', () => {
    for (const value of Object.values(RECEIPT_ACTIONS)) expect(value).toMatch(/^receipts\//)
  })
})
