import type { Transaction, TransactionAccountOption, TransactionPage } from '../../types/transactions'

// Matches transaction 2990 of the running API's sample data, after mapping
export const transaction: Transaction = {
  id: '2990',
  number: 'TXN-2026-002990',
  bankAccountId: '1',
  bankAccountName: 'Operating Checking',
  type: 'Bank Receipt',
  sourceNumber: 'INV-004262',
  direction: 'in',
  date: '2026-11-08',
  party: 'Vendor return',
  amount: 500,
  description: 'Returned from Vendor sales invoice 45',
  status: 'Posted',
  createdAt: '2026-11-08T10:25:54.761078',
  createdBy: 'system',
}

// Money out of a different account, reversed: exercises the red amount and the non-posted badge
export const outgoingTransaction: Transaction = {
  id: '2400',
  number: 'TXN-2026-002400',
  bankAccountId: '4',
  bankAccountName: 'Floor Plan Account',
  type: 'Bank Payment',
  sourceNumber: 'PAY-000812',
  direction: 'out',
  date: '2026-10-15',
  party: 'Toyota Motor Corp',
  amount: 1234.5,
  description: 'Floor plan interest',
  status: 'Reversed',
  createdAt: '2026-10-15T09:00:00',
  createdBy: 'dsullivan',
}

// Optional fields left empty, no id or number: exercises the '—' fallbacks and the disabled link
export const sparseTransaction: Transaction = {
  id: '',
  number: '',
  bankAccountId: '',
  bankAccountName: '',
  type: '',
  sourceNumber: '',
  direction: 'in',
  date: '',
  party: '',
  amount: 0,
  description: '',
  status: '',
  createdAt: '',
  createdBy: '',
}

export const transactionPage: TransactionPage = {
  items: [transaction, outgoingTransaction],
  hasNext: true,
}

export const accountOptions: TransactionAccountOption[] = [
  { id: '1', name: 'Operating Checking', accountNumber: '****4521' },
  { id: '4', name: 'Floor Plan Account', accountNumber: '****9034' },
  { id: '6', name: 'Cash on Hand', accountNumber: '' },
]
