import { combineReducers } from 'redux'
import customersReducer from './customers/customers.reducer'

export const rootReducer = combineReducers({
  customers: customersReducer,
})

export type RootState = ReturnType<typeof rootReducer>
