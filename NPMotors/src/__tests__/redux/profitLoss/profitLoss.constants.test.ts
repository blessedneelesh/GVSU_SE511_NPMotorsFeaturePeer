import { describe, expect, it } from 'vitest'
import { PROFIT_LOSS_ACTIONS } from '../../../redux/profitLoss/profitLoss.constants'

describe('PROFIT_LOSS_ACTIONS', () => {
  it.each([
    ['LOAD', 'profitLoss/load'],
    ['LOAD_SUCCESS', 'profitLoss/loadSuccess'],
    ['LOAD_FAILURE', 'profitLoss/loadFailure'],
    ['SET_PERIOD_TYPE', 'profitLoss/setPeriodType'],
    ['SET_ANCHOR_MONTH', 'profitLoss/setAnchorMonth'],
  ] as const)('%s equals %s', (key, value) => {
    expect(PROFIT_LOSS_ACTIONS[key]).toBe(value)
  })

  it('has 5 action types', () => {
    expect(Object.keys(PROFIT_LOSS_ACTIONS)).toHaveLength(5)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(PROFIT_LOSS_ACTIONS)).size).toBe(Object.keys(PROFIT_LOSS_ACTIONS).length)
  })

  it('prefixes every value with profitLoss/', () => {
    for (const value of Object.values(PROFIT_LOSS_ACTIONS)) expect(value.startsWith('profitLoss/')).toBe(true)
  })
})
