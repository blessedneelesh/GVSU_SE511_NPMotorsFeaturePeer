import { describe, expect, it } from 'vitest'
import { accountLabel, formatAmount, todayIsoDate } from '../../../pages/TransfersPage/transferMetrics'
import { formatAmount as statementFormatAmount } from '../../../pages/StatementLinesPage/statementLineMetrics'
import { accountOptions } from '../../../test/fixtures/transfers'

describe('transferMetrics', () => {
  it('re-exports the bank statement amount format, with cents', () => {
    expect(formatAmount).toBe(statementFormatAmount)
    expect(formatAmount(262733)).toBe('$262,733.00')
  })

  describe('todayIsoDate', () => {
    it('formats the local date as YYYY-MM-DD with zero padding', () => {
      expect(todayIsoDate(new Date(2024, 2, 5, 9, 0))).toBe('2024-03-05')
    })

    it('keeps the local day late in the evening, unlike toISOString', () => {
      expect(todayIsoDate(new Date(2024, 11, 31, 23, 59))).toBe('2024-12-31')
    })

    it('defaults to today', () => {
      expect(todayIsoDate()).toBe(todayIsoDate(new Date()))
    })
  })

  describe('accountLabel', () => {
    it('joins the bank and account names', () => {
      expect(accountLabel(accountOptions[0]!)).toBe('Chase Bank — Operating Checking')
    })

    it('shows only the account name when the bank is unknown', () => {
      expect(accountLabel(accountOptions[2]!)).toBe('Tax Reserve')
    })
  })
})
