import { describe, expect, it } from 'vitest'
import {
  DIRECTION_LABELS,
  formatAmount,
  formatDateTime,
  formatSignedAmount,
  statusBadgeClass,
} from '../../../pages/TransactionsPage/transactionMetrics'

describe('formatAmount', () => {
  it('always shows cents', () => {
    expect(formatAmount(0)).toBe('$0.00')
    expect(formatAmount(500)).toBe('$500.00')
  })

  it('rounds to cents with thousands separators', () => {
    expect(formatAmount(1234.567)).toBe('$1,234.57')
  })
})

describe('formatSignedAmount', () => {
  it('prefixes money in with a plus sign', () => {
    expect(formatSignedAmount({ amount: 500, direction: 'in' })).toBe('+$500.00')
  })

  it('prefixes money out with a true minus sign', () => {
    expect(formatSignedAmount({ amount: 1234.5, direction: 'out' })).toBe('−$1,234.50')
  })

  it('takes the sign from the direction, not the amount', () => {
    expect(formatSignedAmount({ amount: -5, direction: 'out' })).toBe('−$5.00')
    expect(formatSignedAmount({ amount: -5, direction: 'in' })).toBe('+$5.00')
  })
})

describe('DIRECTION_LABELS', () => {
  it('names both directions as the design does', () => {
    expect(DIRECTION_LABELS).toEqual({ in: 'Incoming', out: 'Outgoing' })
  })
})

describe('statusBadgeClass', () => {
  it.each([
    ['Posted', 'badge-posted'],
    ['Draft', 'badge-draft'],
    ['Reversed', 'badge-cancelled'],
    ['Void', 'badge-cancelled'],
  ])('%s → %s', (status, badge) => {
    expect(statusBadgeClass(status)).toBe(badge)
  })
})

describe('formatDateTime', () => {
  it('formats a time-zone-less timestamp as local date and time', () => {
    expect(formatDateTime('2026-11-08T10:25:54.761078')).toMatch(/^Nov 8, 2026, 10:25\sAM$/)
  })

  it('returns an empty string for an empty value', () => {
    expect(formatDateTime('')).toBe('')
  })

  it('returns an unparseable value as-is', () => {
    expect(formatDateTime('yesterday')).toBe('yesterday')
  })
})
