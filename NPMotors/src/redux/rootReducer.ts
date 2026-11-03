import { combineReducers } from 'redux'
import customersReducer from './customers/customers.reducer'
import vendorsReducer from './vendors/vendors.reducer'
import employeesReducer from './employees/employees.reducer'
import vehiclesReducer from './vehicles/vehicles.reducer'
import partsReducer from './parts/parts.reducer'
import salesInvoicesReducer from './salesInvoices/salesInvoices.reducer'

export const rootReducer = combineReducers({
  customers: customersReducer,
  vendors: vendorsReducer,
  employees: employeesReducer,
  vehicles: vehiclesReducer,
  parts: partsReducer,
  salesInvoices: salesInvoicesReducer,
})

export type RootState = ReturnType<typeof rootReducer>
