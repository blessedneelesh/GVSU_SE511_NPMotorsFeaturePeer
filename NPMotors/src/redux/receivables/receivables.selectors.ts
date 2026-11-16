import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectReceivableState = (state: RootState) => state.receivables

export const selectReceivables = createSelector([selectReceivableState], (receivables) => receivables.items)

export const selectReceivableHasNext = createSelector([selectReceivableState], (receivables) => receivables.hasNext)

export const selectReceivableQuery = createSelector([selectReceivableState], (receivables) => receivables.query)

export const selectReceivableListStatus = createSelector([selectReceivableState], (receivables) => receivables.listStatus)

export const selectReceivableListError = createSelector([selectReceivableState], (receivables) => receivables.listError)

export const selectSelectedReceivableId = createSelector([selectReceivableState], (receivables) => receivables.selectedId)

export const selectSelectedReceivable = createSelector([selectReceivableState], (receivables) => receivables.selected)

export const selectReceivableDetailStatus = createSelector([selectReceivableState], (receivables) => receivables.detailStatus)

export const selectReceivableDetailError = createSelector([selectReceivableState], (receivables) => receivables.detailError)

export const selectReceivableCustomerOptions = createSelector([selectReceivableState], (receivables) => receivables.customerOptions)

export const selectReceivableCustomerOptionsStatus = createSelector([selectReceivableState], (receivables) => receivables.customerOptionsStatus)

export const selectReceivableCustomerOptionsError = createSelector([selectReceivableState], (receivables) => receivables.customerOptionsError)
