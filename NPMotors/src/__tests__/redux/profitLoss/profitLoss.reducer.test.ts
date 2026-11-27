import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/profitLoss/profitLoss.actions'
import { PROFIT_LOSS_ACTIONS } from '../../../redux/profitLoss/profitLoss.constants'
import profitLossReducer, { initialProfitLossState, toMonthValue, type ProfitLossState } from '../../../redux/profitLoss/profitLoss.reducer'
import { monthComparison } from '../../../test/fixtures/reports'

const frozen = (state: ProfitLossState): ProfitLossState => {
  Object.freeze(state.query)
  return Object.freeze(state)
}

describe('profitLossReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(profitLossReducer(undefined, { type: '@@INIT' })).toEqual(initialProfitLossState)
  })

  it('starts on the current month with no report', () => {
    expect(initialProfitLossState).toEqual({ query: { periodType: 'Month', anchorMonth: toMonthValue() }, comparison: null, status: 'idle', error: null })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = frozen({ ...initialProfitLossState, query: { ...initialProfitLossState.query } })
    expect(profitLossReducer(state, { type: 'other/action' })).toBe(state)
  })

  it('LOAD sets loading and clears the error', () => {
    const state = frozen({ ...initialProfitLossState, status: 'error', error: 'old' })
    expect(profitLossReducer(state, actions.loadProfitLoss())).toEqual({ ...initialProfitLossState, status: 'loading', error: null })
  })

  it('LOAD_SUCCESS stores the comparison', () => {
    const state = frozen({ ...initialProfitLossState, status: 'loading' })
    expect(profitLossReducer(state, actions.loadProfitLossSuccess(monthComparison))).toEqual({ ...initialProfitLossState, comparison: monthComparison, status: 'success' })
  })

  it('LOAD_FAILURE keeps the last comparison and stores the message', () => {
    const state = frozen({ ...initialProfitLossState, comparison: monthComparison, status: 'loading' })
    expect(profitLossReducer(state, actions.loadProfitLossFailure('Boom'))).toEqual({ ...state, status: 'error', error: 'Boom' })
  })

  it('SET_PERIOD_TYPE and SET_ANCHOR_MONTH update the query and start loading', () => {
    const state = frozen({ ...initialProfitLossState, query: { periodType: 'Month', anchorMonth: '2026-11' }, status: 'error', error: 'old' })
    expect(profitLossReducer(state, actions.setProfitLossPeriodType('Quarter'))).toEqual({ ...state, status: 'loading', error: null, query: { periodType: 'Quarter', anchorMonth: '2026-11' } })
    expect(profitLossReducer(state, actions.setProfitLossAnchorMonth('2026-03'))).toEqual({ ...state, status: 'loading', error: null, query: { periodType: 'Month', anchorMonth: '2026-03' } })
  })

  it('formats months as YYYY-MM', () => {
    expect(toMonthValue(new Date(2026, 0, 15))).toBe('2026-01')
  })

  it('uses unique profitLoss/ action types', () => {
    const types = Object.values(PROFIT_LOSS_ACTIONS)
    expect(new Set(types).size).toBe(types.length)
    for (const type of types) expect(type.startsWith('profitLoss/')).toBe(true)
  })
})
