import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectPayableState = (state: RootState) => state.payables

export const selectPayables = createSelector([selectPayableState], (payables) => payables.items)

export const selectPayableHasNext = createSelector([selectPayableState], (payables) => payables.hasNext)

export const selectPayableQuery = createSelector([selectPayableState], (payables) => payables.query)

export const selectPayableListStatus = createSelector([selectPayableState], (payables) => payables.listStatus)

export const selectPayableListError = createSelector([selectPayableState], (payables) => payables.listError)

export const selectSelectedPayableId = createSelector([selectPayableState], (payables) => payables.selectedId)

export const selectSelectedPayable = createSelector([selectPayableState], (payables) => payables.selected)

export const selectPayableDetailStatus = createSelector([selectPayableState], (payables) => payables.detailStatus)

export const selectPayableDetailError = createSelector([selectPayableState], (payables) => payables.detailError)

export const selectPayableVendorOptions = createSelector([selectPayableState], (payables) => payables.vendorOptions)

export const selectPayableVendorOptionsStatus = createSelector([selectPayableState], (payables) => payables.vendorOptionsStatus)

export const selectPayableVendorOptionsError = createSelector([selectPayableState], (payables) => payables.vendorOptionsError)
