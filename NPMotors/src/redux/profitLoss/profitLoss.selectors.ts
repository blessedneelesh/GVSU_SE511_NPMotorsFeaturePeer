import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectProfitLossState = (state: RootState) => state.profitLoss

export const selectProfitLossQuery = createSelector([selectProfitLossState], (profitLoss) => profitLoss.query)

export const selectProfitLossComparison = createSelector([selectProfitLossState], (profitLoss) => profitLoss.comparison)

export const selectProfitLossStatus = createSelector([selectProfitLossState], (profitLoss) => profitLoss.status)

export const selectProfitLossError = createSelector([selectProfitLossState], (profitLoss) => profitLoss.error)
