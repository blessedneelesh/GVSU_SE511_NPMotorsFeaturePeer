import { combineReducers } from 'redux'
import customersReducer from './customers/customers.reducer'
import vendorsReducer from './vendors/vendors.reducer'
import employeesReducer from './employees/employees.reducer'

export const rootReducer = combineReducers({
  customers: customersReducer,
  vendors: vendorsReducer,
  employees: employeesReducer,
})

export type RootState = ReturnType<typeof rootReducer>
