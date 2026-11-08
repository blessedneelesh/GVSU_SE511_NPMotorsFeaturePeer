import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectTransferState = (state: RootState) => state.transfers

export const selectTransferAccountOptions = createSelector([selectTransferState], (transfers) => transfers.accountOptions)

export const selectTransferAccountOptionsStatus = createSelector([selectTransferState], (transfers) => transfers.accountOptionsStatus)

export const selectTransferAccountOptionsError = createSelector([selectTransferState], (transfers) => transfers.accountOptionsError)

export const selectTransferSaveStatus = createSelector([selectTransferState], (transfers) => transfers.saveStatus)

export const selectTransferSaveError = createSelector([selectTransferState], (transfers) => transfers.saveError)

export const selectTransferFieldErrors = createSelector([selectTransferState], (transfers) => transfers.fieldErrors)
