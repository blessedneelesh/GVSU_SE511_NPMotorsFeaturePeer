import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectPartState = (state: RootState) => state.parts

export const selectParts = createSelector([selectPartState], (parts) => parts.items)

export const selectPartHasNext = createSelector([selectPartState], (parts) => parts.hasNext)

export const selectPartQuery = createSelector([selectPartState], (parts) => parts.query)

export const selectPartListStatus = createSelector([selectPartState], (parts) => parts.listStatus)

export const selectPartListError = createSelector([selectPartState], (parts) => parts.listError)

export const selectSelectedPartId = createSelector([selectPartState], (parts) => parts.selectedId)

export const selectSelectedPart = createSelector([selectPartState], (parts) => parts.selected)

export const selectPartDetailStatus = createSelector([selectPartState], (parts) => parts.detailStatus)

export const selectPartDetailError = createSelector([selectPartState], (parts) => parts.detailError)

export const selectPartVendorOptions = createSelector([selectPartState], (parts) => parts.vendorOptions)

export const selectPartVendorOptionsStatus = createSelector([selectPartState], (parts) => parts.vendorOptionsStatus)

export const selectPartVendorOptionsError = createSelector([selectPartState], (parts) => parts.vendorOptionsError)

export const selectPartReceiveOptions = createSelector([selectPartState], (parts) => parts.receiveOptions)

export const selectPartReceiveOptionsStatus = createSelector([selectPartState], (parts) => parts.receiveOptionsStatus)

export const selectPartReceiveOptionsError = createSelector([selectPartState], (parts) => parts.receiveOptionsError)

export const selectPartSaveStatus = createSelector([selectPartState], (parts) => parts.saveStatus)

export const selectPartSaveError = createSelector([selectPartState], (parts) => parts.saveError)

export const selectPartReceivedLines = createSelector([selectPartState], (parts) => parts.receivedLines)
