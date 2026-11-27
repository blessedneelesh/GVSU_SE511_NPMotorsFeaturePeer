import { describe, expect, it } from 'vitest'
import { loadDashboard, loadDashboardFailure, loadDashboardSuccess, setDashboardMonth } from '../../../redux/dashboard/dashboard.actions'
import dashboardReducer, { initialDashboardState, toMonthValue } from '../../../redux/dashboard/dashboard.reducer'
import { summary } from '../../../test/fixtures/dashboard'

describe('dashboardReducer', () => {
  it('starts idle on the current month', () => {
    expect(dashboardReducer(undefined, { type: '@@INIT' })).toEqual({ query: { month: toMonthValue() }, summary: null, status: 'idle', error: null })
  })

  it('ignores other slices\' actions', () => {
    expect(dashboardReducer(initialDashboardState, { type: 'profitLoss/load' })).toBe(initialDashboardState)
  })

  it('tracks a load from start to success', () => {
    const loading = dashboardReducer({ ...initialDashboardState, error: 'old' }, loadDashboard())
    expect(loading).toMatchObject({ status: 'loading', error: null })
    expect(dashboardReducer(loading, loadDashboardSuccess(summary))).toMatchObject({ status: 'success', summary })
  })

  it('keeps the previous summary when a load fails', () => {
    const loaded = { ...initialDashboardState, summary, status: 'success' as const }
    expect(dashboardReducer(loaded, loadDashboardFailure('Down'))).toMatchObject({ status: 'error', error: 'Down', summary })
  })

  it('changes the month and starts loading it', () => {
    expect(dashboardReducer(initialDashboardState, setDashboardMonth('2026-10'))).toMatchObject({ query: { month: '2026-10' }, status: 'loading', error: null })
  })

  it('formats the month value', () => {
    expect(toMonthValue(new Date(2026, 0, 5))).toBe('2026-01')
  })
})
