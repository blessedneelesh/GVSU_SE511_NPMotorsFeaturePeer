import type { PaymentMethod } from '../../types/common'
import type { ReceiptBankAccountOption } from '../../types/receipts'

// Same cents formatting and method labels as Receive Payment on Accounts Receivable
export { formatCurrencyExact, paymentMethodLabel, paymentMethodOptions } from '../AccountsReceivablePage/receivableMetrics'
export { todayIsoDate } from '../TransfersPage/transferMetrics'

// "Chase — Operating Checking (****4521)", dropping whichever parts are unknown
export function bankAccountLabel(account: ReceiptBankAccountOption): string {
  const name = account.bankName ? `${account.bankName} — ${account.name}` : account.name
  return account.accountNumber ? `${name} (${account.accountNumber})` : name
}

// Money is compared in whole cents so 0.1 + 0.2 style rounding can't let an overpayment through
export const toCents = (value: number) => Math.round(value * 100)

// What the success card shows; copied at submit time because the lists refetch after posting
export interface PostedBankReceipt {
  amount: number
  receiptDate: string
  paymentMethod: PaymentMethod
  bankAccountName: string
  partyName: string
  // Customer receipts only
  invoiceNumber: string
  reference: string
}
