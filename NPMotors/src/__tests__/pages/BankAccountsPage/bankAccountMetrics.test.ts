import { describe, expect, it } from 'vitest'
import { BANK_ACCOUNT_TYPES, formatCurrency } from '../../../pages/BankAccountsPage/bankAccountMetrics'
import { formatCurrency as customerFormatCurrency } from '../../../pages/CustomersPage/customerMetrics'

describe('bankAccountMetrics', () => {
  it('re-exports the Customers currency format', () => {
    expect(formatCurrency).toBe(customerFormatCurrency)
    expect(formatCurrency(150525)).toBe('$150,525')
  })

  it('offers only the account types AddBankAccount accepts', () => {
    expect(BANK_ACCOUNT_TYPES).toEqual(['Checking', 'Savings', 'Other'])
  })
})
