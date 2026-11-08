import type { BankAccount } from '../../types/bankAccounts'
import type { TransferAccountOption, TransferFormValues } from '../../types/transfers'

// Only active accounts can send or receive money; accounts without an id can't be posted to
export function toTransferAccountOptions(accounts: BankAccount[]): TransferAccountOption[] {
  return accounts
    .filter((account) => account.id && account.status === 'Active')
    .map((account) => ({
      id: account.id,
      name: account.name,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      bookBalance: account.bookBalance,
    }))
}

// Body of POST Transfer/CreateTransfer (CreateTransferRequest). Ids and amount must be JSON numbers;
// description is nullable (max 500), so send null rather than ''.
export interface CreateTransferDto {
  sourceAccountId: number
  destinationAccountId: number
  amount: number
  // YYYY-MM-DD; ASP.NET binds it to a midnight DateTime
  date: string
  description: string | null
}

export function toCreateTransferDto(values: TransferFormValues): CreateTransferDto {
  return {
    sourceAccountId: Number(values.sourceAccountId),
    destinationAccountId: Number(values.destinationAccountId),
    amount: Number(values.amount),
    date: values.date,
    description: values.description.trim() || null,
  }
}
