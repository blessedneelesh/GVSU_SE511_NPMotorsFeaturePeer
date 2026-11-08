import type { BankAccountType } from '../../types/bankAccounts'

// Same whole-dollar format as Customers
export { formatCurrency } from '../CustomersPage/customerMetrics'

// The types AddBankAccount accepts (the design's "Money Market" isn't one of them)
export const BANK_ACCOUNT_TYPES: readonly BankAccountType[] = ['Checking', 'Savings', 'Other']
