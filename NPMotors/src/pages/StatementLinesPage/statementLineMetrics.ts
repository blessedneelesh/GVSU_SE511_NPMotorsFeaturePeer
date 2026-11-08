import type { StatementLine } from '../../types/statementLines'

// Statement amounts show cents, unlike the whole-dollar formatCurrency used by Customers
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatAmount = (amount: number) => currency.format(amount)

// Type chip colors from the design; unknown types fall back to grey
const TYPE_CHIP_CLASSES: Record<string, string> = {
  'Bank Receipt': 'type-chip--green',
  'Bank Payment': 'type-chip--red',
  Transfer: 'type-chip--blue',
  'Bank Interest': 'type-chip--teal',
  'Bank Charge': 'type-chip--orange',
  Payroll: 'type-chip--red',
  Reversal: 'type-chip--violet',
}

export const typeChipClass = (type: string) => TYPE_CHIP_CLASSES[type] ?? ''

// Cleared is green, anything else (Pending, ...) is amber
export const statementStatusBadgeClass = (status: string) => (status === 'Cleared' ? 'badge-posted' : 'badge-pending')

// Matched is blue, anything else (Unmatched, ...) is amber
export const matchStatusBadgeClass = (status: string) => (status === 'Matched' ? 'badge-approved' : 'badge-pending')

export interface StatementTotals {
  deposits: number
  withdrawals: number
}

// Totals of the rows on the current page only; the API has no aggregate endpoint
export const sumPage = (rows: StatementLine[]): StatementTotals =>
  rows.reduce((totals, row) => ({ deposits: totals.deposits + row.deposit, withdrawals: totals.withdrawals + row.withdrawal }), { deposits: 0, withdrawals: 0 })
