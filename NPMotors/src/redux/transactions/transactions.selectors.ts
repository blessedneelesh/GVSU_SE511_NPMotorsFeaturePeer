import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectTransactionState = (state: RootState) => state.transactions

export const selectTransactions = createSelector([selectTransactionState], (transactions) => transactions.items)

export const selectTransactionHasNext = createSelector([selectTransactionState], (transactions) => transactions.hasNext)

export const selectTransactionQuery = createSelector([selectTransactionState], (transactions) => transactions.query)

export const selectTransactionListStatus = createSelector([selectTransactionState], (transactions) => transactions.listStatus)

export const selectTransactionListError = createSelector([selectTransactionState], (transactions) => transactions.listError)

export const selectSelectedTransactionId = createSelector([selectTransactionState], (transactions) => transactions.selectedId)

export const selectSelectedTransaction = createSelector([selectTransactionState], (transactions) => transactions.selected)

export const selectTransactionDetailStatus = createSelector([selectTransactionState], (transactions) => transactions.detailStatus)

export const selectTransactionDetailError = createSelector([selectTransactionState], (transactions) => transactions.detailError)

export const selectTransactionAccountOptions = createSelector([selectTransactionState], (transactions) => transactions.accountOptions)

export const selectTransactionAccountOptionsStatus = createSelector([selectTransactionState], (transactions) => transactions.accountOptionsStatus)

export const selectTransactionAccountOptionsError = createSelector([selectTransactionState], (transactions) => transactions.accountOptionsError)
