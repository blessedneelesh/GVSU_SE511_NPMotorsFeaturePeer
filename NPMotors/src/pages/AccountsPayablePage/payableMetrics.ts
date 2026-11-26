import type { PayableStatus } from '../../types/payables'

// Same whole-dollar amounts, days colouring, page totals, cents format and paid share as Accounts Receivable
export { daysClass, formatCurrency, formatCurrencyExact, formatDays, paidPercent, sumPage } from '../AccountsReceivablePage/receivableMetrics'

// Same badge colours as Accounts Receivable
const STATUS_BADGE_CLASSES: Record<PayableStatus, string> = {
  Paid: 'badge-paid',
  Partial: 'badge-partial',
  Overdue: 'badge-overdue',
  Unpaid: 'badge-pending',
}

export const statusBadgeClass = (status: PayableStatus) => STATUS_BADGE_CLASSES[status]

// The design's aging box for a bill: green when not yet due, amber up to 30 days, orange up to 60, then red
export const payableAgingClass = (days: number) =>
  days <= 0 ? 'aging-current' : days <= 30 ? 'aging-30' : days <= 60 ? 'aging-60' : 'aging-over-60'
