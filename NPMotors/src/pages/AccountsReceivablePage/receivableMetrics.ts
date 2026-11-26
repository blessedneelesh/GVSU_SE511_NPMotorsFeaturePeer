import type { PaymentMethod } from '../../types/common'
import type { ReceiptPayment } from '../../types/receipts'
import type { ReceivableAgingStatus } from '../../types/receivables'

// The design shows whole dollars in the list, like Customers
export { formatCurrency } from '../CustomersPage/customerMetrics'

// Badge colors from the design
const STATUS_BADGE_CLASSES: Record<ReceivableAgingStatus, string> = {
  Paid: 'badge-paid',
  Partial: 'badge-partial',
  Overdue: 'badge-overdue',
  Unpaid: 'badge-pending',
}

export const statusBadgeClass = (status: ReceivableAgingStatus) => STATUS_BADGE_CLASSES[status]

// Not yet due is green; overdue is amber for the first 30 days, then red
export const daysClass = (days: number) => (days <= 0 ? 'text-green' : days > 30 ? 'text-red' : 'text-amber')

export const formatDays = (days: number) => (days > 0 ? `${days}d` : 'Current')

// The detail view shows cents, as the design does
const exactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const formatCurrencyExact = (value: number) => exactCurrency.format(value)

// Share of the invoice collected, 0–100
export const paidPercent = (paid: number, amount: number) => (amount > 0 ? Math.min(Math.max((paid / amount) * 100, 0), 100) : 0)

// The design's aging buckets: current, 1–30, 31–60, 61–90, 90+ days
export const agingClass = (days: number) =>
  days <= 0 ? 'aging-current' : days <= 30 ? 'aging-30' : days <= 60 ? 'aging-60' : days <= 90 ? 'aging-90' : 'aging-90-plus'

// "Lisa Anderson" -> "LA"
export const getNameInitials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '?'

// Unpaid, Partial and Overdue invoices can all take a payment. It's decided by the money, not the badge: a Paid invoice
// never can, and neither can one whose balance is already 0 (the API has rows stored as "unpaid" with nothing due).
export const canReceivePayment = (invoice: { balance: number; agingStatus: ReceivableAgingStatus }) =>
  invoice.balance > 0 && invoice.agingStatus !== 'Paid'

export interface ReceivableTotals {
  amount: number
  paid: number
  balance: number
}

// Totals of the rows on the current page only; the API has no aggregate endpoint. Accounts Payable shares it.
export const sumPage = (rows: readonly ReceivableTotals[]): ReceivableTotals =>
  rows.reduce(
    (totals, row) => ({ amount: totals.amount + row.amount, paid: totals.paid + row.paid, balance: totals.balance + row.balance }),
    { amount: 0, paid: 0, balance: 0 },
  )

// The design's methods that the API's PaymentMethod enum has; it has no "Finance" value, so that option is left out
export const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Credit Card' },
]

export const paymentMethodLabel = (method: PaymentMethod | null) =>
  paymentMethodOptions.find((option) => option.value === method)?.label ?? '—'

// Oldest first, as the timeline reads; same-day receipts by receipt number (they're numbered in posting order)
export const sortPaymentsOldestFirst = (payments: readonly ReceiptPayment[]) =>
  [...payments].sort((a, b) => a.receiptDate.localeCompare(b.receiptDate) || a.receiptNumber.localeCompare(b.receiptNumber))
