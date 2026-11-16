import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectReceiptState = (state: RootState) => state.receipts

export const selectReceiptBankAccountOptions = createSelector([selectReceiptState], (receipts) => receipts.bankAccountOptions)

export const selectReceiptBankAccountOptionsStatus = createSelector([selectReceiptState], (receipts) => receipts.bankAccountOptionsStatus)

export const selectReceiptBankAccountOptionsError = createSelector([selectReceiptState], (receipts) => receipts.bankAccountOptionsError)

export const selectReceiptSaveStatus = createSelector([selectReceiptState], (receipts) => receipts.saveStatus)

export const selectReceiptSaveError = createSelector([selectReceiptState], (receipts) => receipts.saveError)

export const selectReceiptFieldErrors = createSelector([selectReceiptState], (receipts) => receipts.fieldErrors)
