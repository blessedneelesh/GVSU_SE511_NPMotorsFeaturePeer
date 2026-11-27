import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectDashboardState = (state: RootState) => state.dashboard

export const selectDashboardQuery = createSelector([selectDashboardState], (dashboard) => dashboard.query)

export const selectDashboardSummary = createSelector([selectDashboardState], (dashboard) => dashboard.summary)

export const selectDashboardStatus = createSelector([selectDashboardState], (dashboard) => dashboard.status)

export const selectDashboardError = createSelector([selectDashboardState], (dashboard) => dashboard.error)
