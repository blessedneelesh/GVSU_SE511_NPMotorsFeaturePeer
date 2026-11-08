export type StatementLineDirection = 'in' | 'out'

export interface StatementLine {
  id: string
  bankAccountId: string
  bankAccountName: string
  transactionId: string
  // YYYY-MM-DD
  date: string
  reference: string
  description: string
  party: string
  // Spaced by the mapper ("BankReceipt" and "Bank Receipt" both become "Bank Receipt")
  type: string
  direction: StatementLineDirection
  deposit: number
  withdrawal: number
  // The account's balance after this line
  runningBalance: number
  // "Cleared", ...
  statementStatus: string
  // "Matched" or "Unmatched"
  matchStatus: string
  source: string
}

// A bank account id, or 'all' for every account
export type StatementLineBankAccountFilter = string

// The API's Type values (enum names, matched case-insensitively), or 'all'
export type StatementLineTypeFilter = 'all' | 'BankReceipt' | 'BankPayment' | 'Transfer' | 'BankCharge' | 'BankInterest' | 'Payroll' | 'Reversal'

export interface StatementLineQuery {
  pageNumber: number
  pageSize: number
  bankAccountId: StatementLineBankAccountFilter
  // YYYY-MM, or '' for every month
  month: string
  type: StatementLineTypeFilter
}

export interface StatementLinePage {
  items: StatementLine[]
  hasNext: boolean
}

// The account tabs, from GetAllBankAccounts
export interface StatementLineAccountOption {
  id: string
  name: string
  accountNumber: string
  bankName: string
  type: string
  routing: string
  bookBalance: number
}
