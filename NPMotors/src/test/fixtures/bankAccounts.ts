import type { BankAccount, BankAccountFormValues, BankAccountPage, BankAccountSaveError, BankOption } from '../../types/bankAccounts'

// Matches account 1 of the running API's sample data
export const bankAccount: BankAccount = {
  id: '1',
  bankId: '1',
  bankName: 'Chase Bank',
  name: 'Operating Checking',
  accountNumber: '****4521',
  type: 'Checking',
  routing: '021000021',
  bookBalance: 262733,
  status: 'Active',
}

// Optional fields left empty, no id, inactive: exercises the '—' fallbacks and the disabled name link
export const sparseBankAccount: BankAccount = {
  id: '',
  bankId: '',
  bankName: '',
  name: 'Petty Cash',
  accountNumber: '',
  type: '',
  routing: '',
  bookBalance: 0,
  status: 'Inactive',
}

export const bankAccountPage: BankAccountPage = {
  items: [bankAccount, sparseBankAccount],
  hasNext: true,
}

export const bankOptions: BankOption[] = [
  { id: '2', name: 'Bank of America' },
  { id: '1', name: 'Chase Bank' },
]

export const formValues: BankAccountFormValues = {
  bankId: '1',
  name: 'Operations Account',
  type: 'Checking',
  accountNumber: '123456789',
  routing: '021000021',
  openingBalance: '2500',
}

export const saveError: BankAccountSaveError = {
  message: 'Something went wrong while saving.',
  fieldErrors: { bankId: 'A bank account must belong to a bank.' },
}
