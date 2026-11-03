import { combineReducers } from 'redux'
import customersReducer from './customers/customers.reducer'
import vendorsReducer from './vendors/vendors.reducer'
import employeesReducer from './employees/employees.reducer'
import vehiclesReducer from './vehicles/vehicles.reducer'
import partsReducer from './parts/parts.reducer'

export const rootReducer = combineReducers({
  customers: customersReducer,
  vendors: vendorsReducer,
  employees: employeesReducer,
  vehicles: vehiclesReducer,
  parts: partsReducer,
})

export type RootState = ReturnType<typeof rootReducer>
