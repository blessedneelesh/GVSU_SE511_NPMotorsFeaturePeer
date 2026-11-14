import type { Receivable, ReceivableAgingStatus } from '../../types/receivables'

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

export interface ReceivableTotals {
  amount: number
  paid: number
  balance: number
}

// Totals of the rows on the current page only; the API has no aggregate endpoint
export const sumPage = (rows: Receivable[]): ReceivableTotals =>
  rows.reduce(
    (totals, row) => ({ amount: totals.amount + row.amount, paid: totals.paid + row.paid, balance: totals.balance + row.balance }),
    { amount: 0, paid: 0, balance: 0 },
  )
