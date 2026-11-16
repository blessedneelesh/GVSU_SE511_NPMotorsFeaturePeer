import type { BankAccount } from '../../types/bankAccounts'
import type { PaymentMethod } from '../../types/common'
import type { ReceiptBankAccountOption, ReceiptFormValues } from '../../types/receipts'

// Only active accounts can take a deposit; accounts without an id can't be posted to
export function toReceiptBankAccountOptions(accounts: BankAccount[]): ReceiptBankAccountOption[] {
  return accounts
    .filter((account) => account.id && account.status === 'Active')
    .map((account) => ({
      id: account.id,
      name: account.name,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
    }))
}

// Body of POST Receipt/RecordArPayment/{arInvoiceId} (RecordArPaymentRequest). The amount and account id must be
// JSON numbers, the method a camelCase enum name; reference is nullable, so send null rather than ''.
export interface RecordArPaymentDto {
  // YYYY-MM-DD; ASP.NET binds it to a midnight DateTime
  receiptDate: string
  amount: number
  paymentMethod: PaymentMethod
  reference: string | null
  bankAccountId: number
}

export function toRecordArPaymentDto(values: ReceiptFormValues): RecordArPaymentDto {
  return {
    receiptDate: values.receiptDate,
    amount: Number(values.amount),
    paymentMethod: values.paymentMethod,
    reference: values.reference.trim() || null,
    bankAccountId: Number(values.bankAccountId),
  }
}
