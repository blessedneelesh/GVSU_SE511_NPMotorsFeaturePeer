import type { TransferAccountOption, TransferFormValues, TransferSaveError } from '../../types/transfers'

// Accounts 1 and 2 match the running API's sample data; the last one has no bank, so its label is just the name
export const accountOptions: TransferAccountOption[] = [
  { id: '1', name: 'Operating Checking', bankName: 'Chase Bank', accountNumber: '****4521', bookBalance: 262733 },
  { id: '2', name: 'Payroll Account', bankName: 'Chase Bank', accountNumber: '****7788', bookBalance: 135000 },
  { id: '5', name: 'Tax Reserve', bankName: '', accountNumber: '', bookBalance: 0 },
]

export const formValues: TransferFormValues = {
  sourceAccountId: '1',
  destinationAccountId: '2',
  date: '2024-03-31',
  amount: '5000',
  description: 'Fund payroll account',
}

export const saveError: TransferSaveError = {
  message: 'Something went wrong while posting.',
  fieldErrors: { amount: 'The amount must be greater than zero.' },
}
