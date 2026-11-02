import { combineReducers } from 'redux'
import customersReducer from './customers/customers.reducer'
import vendorsReducer from './vendors/vendors.reducer'
import employeesReducer from './employees/employees.reducer'
import vehiclesReducer from './vehicles/vehicles.reducer'

export const rootReducer = combineReducers({
  customers: customersReducer,
  vendors: vendorsReducer,
  employees: employeesReducer,
  vehicles: vehiclesReducer,
})

export type RootState = ReturnType<typeof rootReducer>
