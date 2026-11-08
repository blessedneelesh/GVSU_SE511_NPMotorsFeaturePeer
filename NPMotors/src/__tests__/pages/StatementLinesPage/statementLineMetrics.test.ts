import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  matchStatusBadgeClass,
  statementStatusBadgeClass,
  sumPage,
  typeChipClass,
} from '../../../pages/StatementLinesPage/statementLineMetrics'
import { depositLine, unmatchedLine, withdrawalLine } from '../../../test/fixtures/statementLines'

describe('formatAmount', () => {
  it('always shows cents', () => {
    expect(formatAmount(0)).toBe('$0.00')
    expect(formatAmount(28314)).toBe('$28,314.00')
  })

  it('rounds to cents', () => {
    expect(formatAmount(1234.567)).toBe('$1,234.57')
  })
})

describe('typeChipClass', () => {
  it.each([
    ['Bank Receipt', 'type-chip--green'],
    ['Bank Payment', 'type-chip--red'],
    ['Transfer', 'type-chip--blue'],
    ['Bank Interest', 'type-chip--teal'],
    ['Bank Charge', 'type-chip--orange'],
    ['Payroll', 'type-chip--red'],
    ['Reversal', 'type-chip--violet'],
  ])('%s → %s', (type, chip) => {
    expect(typeChipClass(type)).toBe(chip)
  })

  it('leaves unknown types on the grey default', () => {
    expect(typeChipClass('Adjustment')).toBe('')
  })
})

describe('statementStatusBadgeClass', () => {
  it.each([
    ['Cleared', 'badge-posted'],
    ['Pending', 'badge-pending'],
  ])('%s → %s', (status, badge) => {
    expect(statementStatusBadgeClass(status)).toBe(badge)
  })
})

describe('matchStatusBadgeClass', () => {
  it.each([
    ['Matched', 'badge-approved'],
    ['Unmatched', 'badge-pending'],
  ])('%s → %s', (status, badge) => {
    expect(matchStatusBadgeClass(status)).toBe(badge)
  })
})

describe('sumPage', () => {
  it('adds up the deposits and withdrawals of the rows', () => {
    expect(sumPage([depositLine, withdrawalLine, unmatchedLine])).toEqual({ deposits: 28314, withdrawals: 84025.5 })
  })

  it('returns zeros for an empty page', () => {
    expect(sumPage([])).toEqual({ deposits: 0, withdrawals: 0 })
  })
})
