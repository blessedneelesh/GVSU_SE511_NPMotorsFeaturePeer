import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectStatementLineState = (state: RootState) => state.statementLines

export const selectStatementLines = createSelector([selectStatementLineState], (statementLines) => statementLines.items)

export const selectStatementLineHasNext = createSelector([selectStatementLineState], (statementLines) => statementLines.hasNext)

export const selectStatementLineQuery = createSelector([selectStatementLineState], (statementLines) => statementLines.query)

export const selectStatementLineListStatus = createSelector([selectStatementLineState], (statementLines) => statementLines.listStatus)

export const selectStatementLineListError = createSelector([selectStatementLineState], (statementLines) => statementLines.listError)

export const selectStatementLineAccountOptions = createSelector([selectStatementLineState], (statementLines) => statementLines.accountOptions)

export const selectStatementLineAccountOptionsStatus = createSelector([selectStatementLineState], (statementLines) => statementLines.accountOptionsStatus)

export const selectStatementLineAccountOptionsError = createSelector([selectStatementLineState], (statementLines) => statementLines.accountOptionsError)
