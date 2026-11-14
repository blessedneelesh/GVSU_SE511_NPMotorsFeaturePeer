import { describe, expect, it } from 'vitest'
import { daysClass, formatCurrency, formatDays, statusBadgeClass, sumPage } from '../../../pages/AccountsReceivablePage/receivableMetrics'
import { overdueReceivable, partialReceivable } from '../../../test/fixtures/receivables'

describe('receivableMetrics', () => {
  it('formats whole dollars', () => {
    expect(formatCurrency(18690)).toBe('$18,690')
  })

  it.each([
    ['Paid', 'badge-paid'], ['Partial', 'badge-partial'], ['Overdue', 'badge-overdue'], ['Unpaid', 'badge-pending'],
  ] as const)('gives %s the %s badge', (status, badge) => {
    expect(statusBadgeClass(status)).toBe(badge)
  })

  it.each([[0, 'text-green'], [1, 'text-amber'], [30, 'text-amber'], [31, 'text-red']])('colors %i days %s', (days, color) => {
    expect(daysClass(days)).toBe(color)
  })

  it('shows days overdue, or Current when not yet due', () => {
    expect(formatDays(6)).toBe('6d')
    expect(formatDays(0)).toBe('Current')
  })

  it('sums the page', () => {
    expect(sumPage([overdueReceivable, partialReceivable])).toEqual({ amount: 38290, paid: 1200, balance: 37090 })
    expect(sumPage([])).toEqual({ amount: 0, paid: 0, balance: 0 })
  })
})
