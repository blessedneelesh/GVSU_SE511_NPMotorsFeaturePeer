// The From/To account choices, from GetAllBankAccounts (active accounts only)
export interface TransferAccountOption {
  id: string
  name: string
  bankName: string
  accountNumber: string
  bookBalance: number
}

// Form state: what the user types (ids and amount stay strings until the DTO), before it becomes CreateTransferRequest
export interface TransferFormValues {
  sourceAccountId: string
  destinationAccountId: string
  // YYYY-MM-DD
  date: string
  amount: string
  description: string
}

export type TransferFormField = keyof TransferFormValues

export type TransferFieldErrors = Partial<Record<TransferFormField, string>>

export interface TransferSaveError {
  message: string
  fieldErrors: TransferFieldErrors
}
