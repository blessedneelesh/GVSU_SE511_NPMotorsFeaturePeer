import type { PeriodComparison, ReportPeriod, ReportPeriodType } from '../../types/reports'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 })

// Amounts are shown unsigned; the statement's labels ("Less: Discounts", "Total COGS") carry the direction
export const formatAmount = (amount: number) => currency.format(Math.abs(amount))

// Accounting style: a loss reads "($12,658.33)"
export const formatSigned = (amount: number) => (amount < 0 ? `(${formatAmount(amount)})` : formatAmount(amount))

export const formatPercent = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`)

// Change against the previous period, as the API computes it; null when there is nothing to compare against
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

// Income going up is good; a cost going up is not
export type LineNature = 'income' | 'cost'

export interface ChangeDisplay {
  label: string
  tone: 'positive' | 'negative' | 'neutral'
}

export function describeChange(pct: number | null, nature: LineNature): ChangeDisplay {
  if (pct === null) return { label: '—', tone: 'neutral' }
  const rounded = Math.round(pct * 10) / 10
  if (rounded === 0) return { label: '0.0%', tone: 'neutral' }
  const favorable = nature === 'income' ? rounded > 0 : rounded < 0
  return { label: `${rounded > 0 ? '▲' : '▼'} ${Math.abs(rounded).toFixed(1)}%`, tone: favorable ? 'positive' : 'negative' }
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// 'YYYY-MM…' → { year, month (0-11) }; parsed by hand so the time zone can't shift the month
function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})/.exec(value)
  if (!match) return null
  const month = Number(match[2]) - 1
  return month >= 0 && month < 12 ? { year: Number(match[1]), month } : null
}

export const formatMonth = (value: string) => {
  const parsed = parseYearMonth(value)
  return parsed ? `${MONTH_NAMES[parsed.month]} ${parsed.year}` : value
}

// "November 2026", "Q4 2026" or "YTD 2026", from the period the API actually reported on
export function periodLabel(period: ReportPeriod): string {
  const parsed = parseYearMonth(period.startDate)
  if (!parsed) return 'Period'
  if (period.periodType === 'Quarter') return `Q${Math.floor(parsed.month / 3) + 1} ${parsed.year}`
  if (period.periodType === 'YearToDate') return `YTD ${parsed.year}`
  return `${MONTH_NAMES[parsed.month]} ${parsed.year}`
}

export const periodTypeOptions: { value: ReportPeriodType; label: string }[] = [
  { value: 'Month', label: 'Month' },
  { value: 'Quarter', label: 'Quarter' },
  { value: 'YearToDate', label: 'Year to Date' },
]

// The anchor month choices: this month and the ones before it, newest first
export function monthOptions(count = 24, today: Date = new Date()): { value: string; label: string }[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { value, label: formatMonth(value) }
  })
}

export type SubtotalTone = 'blue' | 'green' | 'neutral' | 'dark'

export type StatementLine =
  | { kind: 'section'; label: string }
  | { kind: 'line'; label: string; current: number; previous: number; nature: LineNature; muted?: boolean }
  | { kind: 'subtotal'; label: string; current: number; previous: number; nature: LineNature; tone: SubtotalTone; changePct: number | null }

// The statement rows in the design's order. Line changes are computed here; subtotal changes come from the API.
export function buildStatement({ current: c, previous: p, ...changes }: PeriodComparison): StatementLine[] {
  const line = (label: string, current: number, previous: number, nature: LineNature, muted = false): StatementLine =>
    ({ kind: 'line', label, current, previous, nature, muted })

  return [
    { kind: 'section', label: 'Revenue' },
    line('Vehicle Sales', c.revenue.vehicleRevenue, p.revenue.vehicleRevenue, 'income'),
    line('Service Revenue', c.revenue.serviceRevenue, p.revenue.serviceRevenue, 'income'),
    line('Fees Income', c.revenue.feeIncome, p.revenue.feeIncome, 'income'),
    line('Interest Income', c.revenue.interestIncome, p.revenue.interestIncome, 'income'),
    line('Other Income', c.revenue.otherIncome, p.revenue.otherIncome, 'income'),
    line('Less: Discounts', c.revenue.discounts, p.revenue.discounts, 'cost', true),
    { kind: 'subtotal', label: 'Total Revenue', current: c.totalRevenue, previous: p.totalRevenue, nature: 'income', tone: 'blue', changePct: changes.revenueChangePct },

    { kind: 'section', label: 'Cost of Goods Sold' },
    line('Cost of Vehicles Sold', c.cogs.vehicleCogs, p.cogs.vehicleCogs, 'cost'),
    line('Cost of Parts Sold', c.cogs.partsCogs, p.cogs.partsCogs, 'cost'),
    { kind: 'subtotal', label: 'Total COGS', current: c.totalCogs, previous: p.totalCogs, nature: 'cost', tone: 'neutral', changePct: changes.cogsChangePct },
    { kind: 'subtotal', label: 'GROSS PROFIT', current: c.grossProfit, previous: p.grossProfit, nature: 'income', tone: 'green', changePct: changes.grossProfitChangePct },

    { kind: 'section', label: 'Operating Expenses' },
    line('Salary Expense', c.operatingExpenses.salaryExpense, p.operatingExpenses.salaryExpense, 'cost'),
    line('Bonus Expense', c.operatingExpenses.bonusExpense, p.operatingExpenses.bonusExpense, 'cost'),
    line('Commission Expense', c.operatingExpenses.commissionExpense, p.operatingExpenses.commissionExpense, 'cost'),
    line('Categorized Payments', c.operatingExpenses.categorizedPayments, p.operatingExpenses.categorizedPayments, 'cost'),
    line('Bank Charges', c.operatingExpenses.bankCharges, p.operatingExpenses.bankCharges, 'cost'),
    { kind: 'subtotal', label: 'Total Operating Expenses', current: c.totalOperatingExpenses, previous: p.totalOperatingExpenses, nature: 'cost', tone: 'neutral', changePct: changes.operatingExpenseChangePct },
    { kind: 'subtotal', label: 'NET PROFIT', current: c.netProfit, previous: p.netProfit, nature: 'income', tone: 'dark', changePct: changes.netProfitChangePct },
  ]
}

export const lineChange = (line: Exclude<StatementLine, { kind: 'section' }>): ChangeDisplay =>
  describeChange(line.kind === 'subtotal' ? line.changePct : percentChange(line.current, line.previous), line.nature)
