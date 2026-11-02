import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectCustomerState = (state: RootState) => state.customers

export const selectCustomers = createSelector([selectCustomerState], (customers) => customers.items)

export const selectCustomerHasNext = createSelector([selectCustomerState], (customers) => customers.hasNext)

export const selectCustomerQuery = createSelector([selectCustomerState], (customers) => customers.query)

export const selectCustomerListStatus = createSelector([selectCustomerState], (customers) => customers.listStatus)

export const selectCustomerListError = createSelector([selectCustomerState], (customers) => customers.listError)

export const selectSelectedCustomerId = createSelector([selectCustomerState], (customers) => customers.selectedId)

export const selectSelectedCustomer = createSelector([selectCustomerState], (customers) => customers.selected)

export const selectCustomerDetailStatus = createSelector([selectCustomerState], (customers) => customers.detailStatus)

export const selectCustomerDetailError = createSelector([selectCustomerState], (customers) => customers.detailError)

export const selectCustomerSaveStatus = createSelector([selectCustomerState], (customers) => customers.saveStatus)

export const selectCustomerSaveError = createSelector([selectCustomerState], (customers) => customers.saveError)

export const selectCustomerFieldErrors = createSelector([selectCustomerState], (customers) => customers.fieldErrors)
