import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectCustomerState = (state: RootState) => state.customers

export const selectCustomers = createSelector([selectCustomerState], (customers) => customers.items)

export const selectCustomerHasNext = createSelector([selectCustomerState], (customers) => customers.hasNext)

export const selectCustomerQuery = createSelector([selectCustomerState], (customers) => customers.query)

export const selectCustomerListStatus = createSelector([selectCustomerState], (customers) => customers.listStatus)

export const selectCustomerListError = createSelector([selectCustomerState], (customers) => customers.listError)
