export type TransactionDirection = 'in' | 'out'
export type TransactionDirectionFilter = 'all' | TransactionDirection

export interface Transaction {
  id: string
  number: string
  bankAccountId: string
  bankAccountName: string
  // Spaced and title-cased by the mapper ("BankReceipt" and "Bank Receipt" both become "Bank Receipt")
  type: string
  sourceNumber: string
  direction: TransactionDirection
  // YYYY-MM-DD
  date: string
  party: string
  amount: number
  description: string
  // Title-cased by the mapper ("posted" becomes "Posted")
  status: string
  createdAt: string
  createdBy: string
}

// A bank account id, or 'all' for every account
export type TransactionBankAccountFilter = string

export interface TransactionQuery {
  pageNumber: number
  pageSize: number
  bankAccountId: TransactionBankAccountFilter
  direction: TransactionDirectionFilter
  // YYYY-MM-DD, or '' for no bound
  dateFrom: string
  dateTo: string
}

export interface TransactionPage {
  items: Transaction[]
  hasNext: boolean
}

// The Bank Account filter's options, from GetAllBankAccounts
export interface TransactionAccountOption {
  id: string
  name: string
  accountNumber: string
}
