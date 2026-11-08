import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectBankAccountState = (state: RootState) => state.bankAccounts

export const selectBankAccounts = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.items)

export const selectBankAccountHasNext = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.hasNext)

export const selectBankAccountQuery = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.query)

export const selectBankAccountListStatus = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.listStatus)

export const selectBankAccountListError = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.listError)

export const selectSelectedBankAccountId = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.selectedId)

export const selectSelectedBankAccount = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.selected)

export const selectBankAccountDetailStatus = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.detailStatus)

export const selectBankAccountDetailError = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.detailError)

export const selectBankOptions = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.bankOptions)

export const selectBankOptionsStatus = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.bankOptionsStatus)

export const selectBankOptionsError = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.bankOptionsError)

export const selectBankAccountSaveStatus = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.saveStatus)

export const selectBankAccountSaveError = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.saveError)

export const selectBankAccountFieldErrors = createSelector([selectBankAccountState], (bankAccounts) => bankAccounts.fieldErrors)
