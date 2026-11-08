import type { StatementLine, StatementLineAccountOption, StatementLinePage } from '../../types/statementLines'

// Matches statement line 1 of the running API's sample data, after mapping
export const depositLine: StatementLine = {
  id: '1',
  bankAccountId: '1',
  bankAccountName: 'Operating Checking',
  transactionId: '1',
  date: '2024-03-01',
  reference: 'BR-2024-0001',
  description: 'Full payment for SI-0001',
  party: 'John Smith',
  type: 'Bank Receipt',
  direction: 'in',
  deposit: 28314,
  withdrawal: 0,
  runningBalance: 278314,
  statementStatus: 'Cleared',
  matchStatus: 'Matched',
  source: 'Simulated',
}

// Matches statement line 2: money out of the same account
export const withdrawalLine: StatementLine = {
  id: '2',
  bankAccountId: '1',
  bankAccountName: 'Operating Checking',
  transactionId: '8',
  date: '2024-03-05',
  reference: 'BP-2024-0001',
  description: 'Payment of BILL-0018',
  party: 'ABC Auto Auction',
  type: 'Bank Payment',
  direction: 'out',
  deposit: 0,
  withdrawal: 84000,
  runningBalance: 194314,
  statementStatus: 'Cleared',
  matchStatus: 'Matched',
  source: 'Simulated',
}

// Pending and unmatched, with an unknown type: exercises the amber badges and the grey chip
export const unmatchedLine: StatementLine = {
  id: '3',
  bankAccountId: '4',
  bankAccountName: 'Floor Plan Account',
  transactionId: '',
  date: '2026-11-02',
  reference: 'BC-2026-0007',
  description: 'Monthly service fee',
  party: 'First National Bank',
  type: 'Adjustment',
  direction: 'out',
  deposit: 0,
  withdrawal: 25.5,
  runningBalance: 99974.5,
  statementStatus: 'Pending',
  matchStatus: 'Unmatched',
  source: 'Simulated',
}

// Optional fields left empty, no id: exercises the '—' fallbacks and the fallback row key
export const sparseLine: StatementLine = {
  id: '',
  bankAccountId: '',
  bankAccountName: '',
  transactionId: '',
  date: '',
  reference: '',
  description: '',
  party: '',
  type: '',
  direction: 'in',
  deposit: 0,
  withdrawal: 0,
  runningBalance: 0,
  statementStatus: '',
  matchStatus: '',
  source: '',
}

export const statementLinePage: StatementLinePage = {
  items: [depositLine, withdrawalLine],
  hasNext: true,
}

export const statementAccountOptions: StatementLineAccountOption[] = [
  { id: '1', name: 'Operating Checking', accountNumber: '****4521', bankName: 'Chase Bank', type: 'Checking', routing: '021000021', bookBalance: 250000 },
  { id: '4', name: 'Floor Plan Account', accountNumber: '****9034', bankName: 'Ally Financial', type: 'Other', routing: '', bookBalance: 100000 },
  { id: '6', name: 'Cash on Hand', accountNumber: '', bankName: '', type: '', routing: '', bookBalance: 0 },
]
