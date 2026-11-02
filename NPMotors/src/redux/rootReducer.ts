import { combineReducers } from 'redux'
import customersReducer from './customers/customers.reducer'
import vendorsReducer from './vendors/vendors.reducer'

export const rootReducer = combineReducers({
  customers: customersReducer,
  vendors: vendorsReducer,
})

export type RootState = ReturnType<typeof rootReducer>
