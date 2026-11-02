import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectVendorState = (state: RootState) => state.vendors

export const selectVendors = createSelector([selectVendorState], (vendors) => vendors.items)

export const selectVendorHasNext = createSelector([selectVendorState], (vendors) => vendors.hasNext)

export const selectVendorQuery = createSelector([selectVendorState], (vendors) => vendors.query)

export const selectVendorListStatus = createSelector([selectVendorState], (vendors) => vendors.listStatus)

export const selectVendorListError = createSelector([selectVendorState], (vendors) => vendors.listError)

export const selectSelectedVendorId = createSelector([selectVendorState], (vendors) => vendors.selectedId)

export const selectSelectedVendor = createSelector([selectVendorState], (vendors) => vendors.selected)

export const selectVendorDetailStatus = createSelector([selectVendorState], (vendors) => vendors.detailStatus)

export const selectVendorDetailError = createSelector([selectVendorState], (vendors) => vendors.detailError)

export const selectVendorSaveStatus = createSelector([selectVendorState], (vendors) => vendors.saveStatus)

export const selectVendorSaveError = createSelector([selectVendorState], (vendors) => vendors.saveError)

export const selectVendorFieldErrors = createSelector([selectVendorState], (vendors) => vendors.fieldErrors)
