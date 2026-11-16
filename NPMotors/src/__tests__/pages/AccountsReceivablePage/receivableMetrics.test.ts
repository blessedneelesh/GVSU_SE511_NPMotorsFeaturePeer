import { describe, expect, it } from 'vitest'
import {
  agingClass,
  canReceivePayment,
  daysClass,
  formatCurrency,
  formatCurrencyExact,
  formatDays,
  getNameInitials,
  paidPercent,
  statusBadgeClass,
  sumPage,
} from '../../../pages/AccountsReceivablePage/receivableMetrics'
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

  it('formats cents for the detail view', () => {
    expect(formatCurrencyExact(27500)).toBe('$27,500.00')
    expect(formatCurrencyExact(0.5)).toBe('$0.50')
  })

  it('computes the collected share, clamped to 0–100', () => {
    expect(paidPercent(1850, 29350)).toBeCloseTo(6.3, 1)
    expect(paidPercent(500, 100)).toBe(100)
    expect(paidPercent(-5, 100)).toBe(0)
    expect(paidPercent(10, 0)).toBe(0)
  })

  it.each([
    [0, 'aging-current'], [1, 'aging-30'], [30, 'aging-30'], [31, 'aging-60'], [60, 'aging-60'], [61, 'aging-90'], [90, 'aging-90'], [91, 'aging-90-plus'],
  ])('puts %i days in %s', (days, bucket) => {
    expect(agingClass(days)).toBe(bucket)
  })

  it('builds initials from a name', () => {
    expect(getNameInitials('Lisa Anderson')).toBe('LA')
    expect(getNameInitials('  cher ')).toBe('C')
    expect(getNameInitials('Mary Ann de Vries')).toBe('MA')
    expect(getNameInitials('')).toBe('?')
  })

  it.each([
    ['an unpaid invoice', 100, 'Unpaid', true],
    ['a partly paid invoice', 100, 'Partial', true],
    ['an overdue invoice', 100, 'Overdue', true],
    ['a paid invoice', 0, 'Paid', false],
    ['a paid invoice that still shows a balance', 100, 'Paid', false],
    ['an "unpaid" invoice with nothing left to pay', 0, 'Unpaid', false],
    ['an overpaid invoice', -50, 'Overdue', false],
  ] as const)('can receive a payment against %s: %s', (_, balance, agingStatus, expected) => {
    expect(canReceivePayment({ balance, agingStatus })).toBe(expected)
  })

  it('sums the page', () => {
    expect(sumPage([overdueReceivable, partialReceivable])).toEqual({ amount: 38290, paid: 1200, balance: 37090 })
    expect(sumPage([])).toEqual({ amount: 0, paid: 0, balance: 0 })
  })
})
