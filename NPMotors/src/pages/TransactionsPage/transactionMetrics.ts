import type { Transaction, TransactionDirection } from '../../types/transactions'

// Transactions show cents, unlike the whole-dollar formatCurrency used by Customers
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatAmount = (amount: number) => currency.format(amount)

// "+$500.00" for money in, "−$500.00" (a true minus sign, as the design uses) for money out
export const formatSignedAmount = (transaction: Pick<Transaction, 'amount' | 'direction'>) =>
  `${transaction.direction === 'in' ? '+' : '−'}${formatAmount(Math.abs(transaction.amount))}`

export const DIRECTION_LABELS: Record<TransactionDirection, string> = {
  in: 'Incoming',
  out: 'Outgoing',
}

// Posted is green, Draft is grey, anything else (Reversed, Void, ...) is red
export const statusBadgeClass = (status: string) =>
  status === 'Posted' ? 'badge-posted' : status === 'Draft' ? 'badge-draft' : 'badge-cancelled'

const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

// created_At has no time zone, so it's read as local time; unparseable values are shown as-is
export function formatDateTime(value: string): string {
  const parsed = new Date(value)
  return value && !Number.isNaN(parsed.getTime()) ? dateTime.format(parsed) : value
}
