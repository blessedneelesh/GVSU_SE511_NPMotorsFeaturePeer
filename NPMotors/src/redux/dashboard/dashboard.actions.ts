import type { DashboardSummary } from '../../types/dashboard'
import { DASHBOARD_ACTIONS } from './dashboard.constants'

// Loads the summary (GetSummary) for the current query
export const loadDashboard = () => ({ type: DASHBOARD_ACTIONS.LOAD })

export const loadDashboardSuccess = (summary: DashboardSummary) => ({ type: DASHBOARD_ACTIONS.LOAD_SUCCESS, payload: summary })

export const loadDashboardFailure = (message: string) => ({ type: DASHBOARD_ACTIONS.LOAD_FAILURE, payload: message })

// month is 'YYYY-MM'
export const setDashboardMonth = (month: string) => ({ type: DASHBOARD_ACTIONS.SET_MONTH, payload: month })

export type DashboardAction =
  | ReturnType<typeof loadDashboard>
  | ReturnType<typeof loadDashboardSuccess>
  | ReturnType<typeof loadDashboardFailure>
  | ReturnType<typeof setDashboardMonth>
