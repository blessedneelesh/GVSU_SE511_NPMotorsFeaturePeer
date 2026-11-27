import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { PeriodComparison, ReportQuery } from '../../types/reports'
import type { ProfitLossAction } from './profitLoss.actions'
import { PROFIT_LOSS_ACTIONS } from './profitLoss.constants'

export interface ProfitLossState {
  query: ReportQuery
  // Kept while another period loads, so the statement dims instead of disappearing
  comparison: PeriodComparison | null
  status: RequestStatus
  error: string | null
}

// The month picker's 'YYYY-MM' value for a date (today by default)
export function toMonthValue(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const initialProfitLossState: ProfitLossState = {
  query: { periodType: 'Month', anchorMonth: toMonthValue() },
  comparison: null,
  status: 'idle',
  error: null,
}

const profitLossActionTypes: ReadonlySet<string> = new Set(Object.values(PROFIT_LOSS_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isProfitLossAction = (action: UnknownAction): action is ProfitLossAction => profitLossActionTypes.has(action.type)

export default function profitLossReducer(state: ProfitLossState = initialProfitLossState, action: UnknownAction): ProfitLossState {
  if (!isProfitLossAction(action)) return state

  switch (action.type) {
    case PROFIT_LOSS_ACTIONS.LOAD:
      return { ...state, status: 'loading', error: null }
    case PROFIT_LOSS_ACTIONS.LOAD_SUCCESS:
      return { ...state, comparison: action.payload, status: 'success' }
    case PROFIT_LOSS_ACTIONS.LOAD_FAILURE:
      return { ...state, status: 'error', error: action.payload }
    case PROFIT_LOSS_ACTIONS.SET_PERIOD_TYPE:
      return { ...state, status: 'loading', error: null, query: { ...state.query, periodType: action.payload } }
    case PROFIT_LOSS_ACTIONS.SET_ANCHOR_MONTH:
      return { ...state, status: 'loading', error: null, query: { ...state.query, anchorMonth: action.payload } }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
