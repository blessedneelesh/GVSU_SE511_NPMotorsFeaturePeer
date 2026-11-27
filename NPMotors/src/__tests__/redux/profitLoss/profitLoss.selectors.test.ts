import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/profitLoss/profitLoss.selectors'
import { monthComparison } from '../../../test/fixtures/reports'
import { makeProfitLossState } from '../../../test/test-utils'

const query = { periodType: 'Quarter', anchorMonth: '2025-06' } as const

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeProfitLossState({ query, comparison: monthComparison, status: 'error', error: 'report error' })

describe('profitLoss selectors', () => {
  it('selectProfitLossState returns the slice', () => {
    expect(selectors.selectProfitLossState(state)).toBe(state.profitLoss)
  })

  it.each([
    ['selectProfitLossQuery', selectors.selectProfitLossQuery, query],
    ['selectProfitLossComparison', selectors.selectProfitLossComparison, monthComparison],
    ['selectProfitLossStatus', selectors.selectProfitLossStatus, 'error'],
    ['selectProfitLossError', selectors.selectProfitLossError, 'report error'],
  ] as const)('%s reads its field', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  it('memoizes on the slice', () => {
    expect(selectors.selectProfitLossComparison(state)).toBe(selectors.selectProfitLossComparison(state))
  })
})
