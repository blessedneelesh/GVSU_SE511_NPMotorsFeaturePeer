import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/profitLoss/profitLoss.actions'
import { PROFIT_LOSS_ACTIONS } from '../../../redux/profitLoss/profitLoss.constants'
import { monthComparison } from '../../../test/fixtures/reports'

describe('profitLoss actions', () => {
  it('loadProfitLoss creates { type } with no payload key', () => {
    const action = actions.loadProfitLoss()
    expect(action).toEqual({ type: PROFIT_LOSS_ACTIONS.LOAD })
    expect(action).not.toHaveProperty('payload')
  })

  it('loadProfitLossSuccess carries the comparison', () => {
    expect(actions.loadProfitLossSuccess(monthComparison)).toEqual({ type: PROFIT_LOSS_ACTIONS.LOAD_SUCCESS, payload: monthComparison })
  })

  it('loadProfitLossFailure carries the message', () => {
    expect(actions.loadProfitLossFailure('Network error')).toEqual({ type: PROFIT_LOSS_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it.each(['Month', 'Quarter', 'YearToDate'] as const)('setProfitLossPeriodType carries %s', (periodType) => {
    expect(actions.setProfitLossPeriodType(periodType)).toEqual({ type: PROFIT_LOSS_ACTIONS.SET_PERIOD_TYPE, payload: periodType })
  })

  it('setProfitLossAnchorMonth carries the YYYY-MM month', () => {
    expect(actions.setProfitLossAnchorMonth('2026-03')).toEqual({ type: PROFIT_LOSS_ACTIONS.SET_ANCHOR_MONTH, payload: '2026-03' })
  })
})
