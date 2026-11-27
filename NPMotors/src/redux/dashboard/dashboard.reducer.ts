import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { DashboardQuery, DashboardSummary } from '../../types/dashboard'
import type { DashboardAction } from './dashboard.actions'
import { DASHBOARD_ACTIONS } from './dashboard.constants'

export interface DashboardState {
  query: DashboardQuery
  // Kept while another month loads, so the dashboard dims instead of disappearing
  summary: DashboardSummary | null
  status: RequestStatus
  error: string | null
}

// The month picker's 'YYYY-MM' value for a date (today by default)
export function toMonthValue(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const initialDashboardState: DashboardState = {
  query: { month: toMonthValue() },
  summary: null,
  status: 'idle',
  error: null,
}

const dashboardActionTypes: ReadonlySet<string> = new Set(Object.values(DASHBOARD_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isDashboardAction = (action: UnknownAction): action is DashboardAction => dashboardActionTypes.has(action.type)

export default function dashboardReducer(state: DashboardState = initialDashboardState, action: UnknownAction): DashboardState {
  if (!isDashboardAction(action)) return state

  switch (action.type) {
    case DASHBOARD_ACTIONS.LOAD:
      return { ...state, status: 'loading', error: null }
    case DASHBOARD_ACTIONS.LOAD_SUCCESS:
      return { ...state, summary: action.payload, status: 'success' }
    case DASHBOARD_ACTIONS.LOAD_FAILURE:
      return { ...state, status: 'error', error: action.payload }
    case DASHBOARD_ACTIONS.SET_MONTH:
      return { ...state, status: 'loading', error: null, query: { ...state.query, month: action.payload } }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
