import type { PayableStatus } from '../../types/payables'

// Same whole-dollar amounts, days colouring and page totals as Accounts Receivable
export { daysClass, formatCurrency, formatDays, sumPage } from '../AccountsReceivablePage/receivableMetrics'

// Same badge colours as Accounts Receivable
const STATUS_BADGE_CLASSES: Record<PayableStatus, string> = {
  Paid: 'badge-paid',
  Partial: 'badge-partial',
  Overdue: 'badge-overdue',
  Unpaid: 'badge-pending',
}

export const statusBadgeClass = (status: PayableStatus) => STATUS_BADGE_CLASSES[status]
