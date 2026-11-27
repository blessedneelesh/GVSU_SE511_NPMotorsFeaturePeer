import type { PeriodComparison, ReportPeriodType } from '../../types/reports'
import { PROFIT_LOSS_ACTIONS } from './profitLoss.constants'

// Loads the current period and the one before it (ComparePeriods) for the current query
export const loadProfitLoss = () => ({ type: PROFIT_LOSS_ACTIONS.LOAD })

export const loadProfitLossSuccess = (comparison: PeriodComparison) => ({ type: PROFIT_LOSS_ACTIONS.LOAD_SUCCESS, payload: comparison })

export const loadProfitLossFailure = (message: string) => ({ type: PROFIT_LOSS_ACTIONS.LOAD_FAILURE, payload: message })

export const setProfitLossPeriodType = (periodType: ReportPeriodType) => ({ type: PROFIT_LOSS_ACTIONS.SET_PERIOD_TYPE, payload: periodType })

// anchorMonth is 'YYYY-MM'
export const setProfitLossAnchorMonth = (anchorMonth: string) => ({ type: PROFIT_LOSS_ACTIONS.SET_ANCHOR_MONTH, payload: anchorMonth })

export type ProfitLossAction =
  | ReturnType<typeof loadProfitLoss>
  | ReturnType<typeof loadProfitLossSuccess>
  | ReturnType<typeof loadProfitLossFailure>
  | ReturnType<typeof setProfitLossPeriodType>
  | ReturnType<typeof setProfitLossAnchorMonth>
