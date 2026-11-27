import { describe, expect, it } from 'vitest'
import {
  buildStatement,
  describeChange,
  formatAmount,
  formatPercent,
  formatSigned,
  monthOptions,
  percentChange,
  periodLabel,
} from '../../../pages/ProfitLossPage/profitLossMetrics'
import { monthComparison } from '../../../test/fixtures/reports'

describe('profitLossMetrics', () => {
  it('formats amounts unsigned with up to two decimals, and losses in parentheses', () => {
    expect(formatAmount(367800)).toBe('$367,800')
    expect(formatAmount(758.3333)).toBe('$758.33')
    expect(formatAmount(-5)).toBe('$5')
    expect(formatSigned(-12658.3333)).toBe('($12,658.33)')
    expect(formatSigned(72310)).toBe('$72,310')
  })

  it('formats nullable percentages', () => {
    expect(formatPercent(19.49)).toBe('19.5%')
    expect(formatPercent(null)).toBe('—')
  })

  it('computes the change against the previous period like the API', () => {
    expect(percentChange(23778.33, 12658.33)).toBeCloseTo(87.85, 2)
    expect(percentChange(48531.67, -12658.33)).toBeCloseTo(483.4, 1)
    expect(percentChange(5, 0)).toBeNull()
  })

  it('colours a change by whether it is favourable', () => {
    expect(describeChange(12.34, 'income')).toEqual({ label: '▲ 12.3%', tone: 'positive' })
    expect(describeChange(12.34, 'cost')).toEqual({ label: '▲ 12.3%', tone: 'negative' })
    expect(describeChange(-4, 'cost')).toEqual({ label: '▼ 4.0%', tone: 'positive' })
    expect(describeChange(0.01, 'income')).toEqual({ label: '0.0%', tone: 'neutral' })
    expect(describeChange(null, 'income')).toEqual({ label: '—', tone: 'neutral' })
  })

  it('labels periods from their start date', () => {
    expect(periodLabel({ periodType: 'Month', startDate: '2026-11-01', endDate: '2026-11-30' })).toBe('November 2026')
    expect(periodLabel({ periodType: 'Quarter', startDate: '2026-07-01', endDate: '2026-09-30' })).toBe('Q3 2026')
    expect(periodLabel({ periodType: 'YearToDate', startDate: '2025-01-01', endDate: '2025-11-30' })).toBe('YTD 2025')
    expect(periodLabel({ periodType: 'Month', startDate: '', endDate: '' })).toBe('Period')
  })

  it('lists this month and the previous ones, newest first', () => {
    const options = monthOptions(3, new Date(2026, 0, 15))
    expect(options).toEqual([
      { value: '2026-01', label: 'January 2026' },
      { value: '2025-12', label: 'December 2025' },
      { value: '2025-11', label: 'November 2025' },
    ])
  })

  it('builds the statement in the design order with the API change for subtotals', () => {
    const lines = buildStatement(monthComparison)
    expect(lines.map((line) => line.label)).toEqual([
      'Revenue', 'Vehicle Sales', 'Service Revenue', 'Fees Income', 'Interest Income', 'Other Income', 'Less: Discounts', 'Total Revenue',
      'Cost of Goods Sold', 'Cost of Vehicles Sold', 'Cost of Parts Sold', 'Total COGS', 'GROSS PROFIT',
      'Operating Expenses', 'Salary Expense', 'Bonus Expense', 'Commission Expense', 'Categorized Payments', 'Bank Charges',
      'Total Operating Expenses', 'NET PROFIT',
    ])
    expect(lines.at(-1)).toMatchObject({ kind: 'subtotal', current: 48531.6666666667, previous: -12658.3333333333, changePct: 483.4, tone: 'dark' })
  })
})
