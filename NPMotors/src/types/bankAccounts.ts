export type BankAccountStatus = 'Active' | 'Inactive'

// AddBankAccount only accepts these; older rows can carry other types ("Payroll", "Cash on hand"), which the list shows as-is
export type BankAccountType = 'Checking' | 'Savings' | 'Other'

export interface BankAccount {
  id: string
  bankId: string
  bankName: string
  name: string
  accountNumber: string
  type: string
  routing: string
  bookBalance: number
  status: BankAccountStatus
}

// A bank id, or 'all' for every bank
export type BankAccountBankFilter = string

export interface BankAccountQuery {
  pageNumber: number
  pageSize: number
  bankId: BankAccountBankFilter
  searchTerm: string
}

export interface BankAccountPage {
  items: BankAccount[]
  hasNext: boolean
}

// There is no Bank endpoint yet, so banks are the distinct bankId/bankName pairs of the accounts
export interface BankOption {
  id: string
  name: string
}

// Form state: what the user types (the bank id and balance stay strings until the DTO), before it becomes BankAccountCreateDto
export interface BankAccountFormValues {
  bankId: string
  name: string
  type: BankAccountType
  accountNumber: string
  routing: string
  openingBalance: string
}

export type BankAccountFormField = keyof BankAccountFormValues

export type BankAccountFieldErrors = Partial<Record<BankAccountFormField, string>>

export interface BankAccountSaveError {
  message: string
  fieldErrors: BankAccountFieldErrors
}
