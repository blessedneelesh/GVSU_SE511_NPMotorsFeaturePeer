import type { ReactElement } from 'react'
import { applyMiddleware, legacy_createStore as createStore, type Middleware, type UnknownAction } from 'redux'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { initialCustomersState, type CustomersState } from '../redux/customers/customers.reducer'
import { rootReducer, type RootState } from '../redux/rootReducer'
import { initialVendorsState, type VendorsState } from '../redux/vendors/vendors.reducer'
import { initialEmployeesState, type EmployeesState } from '../redux/employees/employees.reducer'
import { initialVehiclesState, type VehiclesState } from '../redux/vehicles/vehicles.reducer'
import { initialPartsState, type PartsState } from '../redux/parts/parts.reducer'
import { initialSalesInvoicesState, type SalesInvoicesState } from '../redux/salesInvoices/salesInvoices.reducer'
import { initialBankAccountsState, type BankAccountsState } from '../redux/bankAccounts/bankAccounts.reducer'
import { initialTransactionsState, type TransactionsState } from '../redux/transactions/transactions.reducer'

// Builds a full RootState from each slice's initial state; tests override only what the scenario needs
export const makeState = (
  overrides: Partial<CustomersState> = {},
  vendorOverrides: Partial<VendorsState> = {},
  employeeOverrides: Partial<EmployeesState> = {},
  vehicleOverrides: Partial<VehiclesState> = {},
  partOverrides: Partial<PartsState> = {},
  salesInvoiceOverrides: Partial<SalesInvoicesState> = {},
  bankAccountOverrides: Partial<BankAccountsState> = {},
  transactionOverrides: Partial<TransactionsState> = {},
): RootState => ({
  customers: { ...initialCustomersState, ...overrides },
  vendors: { ...initialVendorsState, ...vendorOverrides },
  employees: { ...initialEmployeesState, ...employeeOverrides },
  vehicles: { ...initialVehiclesState, ...vehicleOverrides },
  parts: { ...initialPartsState, ...partOverrides },
  salesInvoices: { ...initialSalesInvoicesState, ...salesInvoiceOverrides },
  bankAccounts: { ...initialBankAccountsState, ...bankAccountOverrides },
  transactions: { ...initialTransactionsState, ...transactionOverrides },
})

// Shorthand for vendor tests: default customers slice, overridden vendors slice
export const makeVendorState = (overrides: Partial<VendorsState> = {}): RootState => makeState({}, overrides)

// Shorthand for employee tests: default customers and vendors slices, overridden employees slice
export const makeEmployeeState = (overrides: Partial<EmployeesState> = {}): RootState => makeState({}, {}, overrides)

// Shorthand for vehicle tests: default customers, vendors and employees slices, overridden vehicles slice
export const makeVehicleState = (overrides: Partial<VehiclesState> = {}): RootState => makeState({}, {}, {}, overrides)

// Shorthand for part tests: every other slice at its default, overridden parts slice
export const makePartState = (overrides: Partial<PartsState> = {}): RootState => makeState({}, {}, {}, {}, overrides)

// Shorthand for sales invoice tests: every other slice at its default, overridden sales invoices slice
export const makeSalesInvoiceState = (overrides: Partial<SalesInvoicesState> = {}): RootState =>
  makeState({}, {}, {}, {}, {}, overrides)

// Shorthand for bank account tests: every other slice at its default, overridden bank accounts slice
export const makeBankAccountState = (overrides: Partial<BankAccountsState> = {}): RootState =>
  makeState({}, {}, {}, {}, {}, {}, overrides)

// Shorthand for transaction tests: every other slice at its default, overridden transactions slice
export const makeTransactionState = (overrides: Partial<TransactionsState> = {}): RootState =>
  makeState({}, {}, {}, {}, {}, {}, {}, overrides)

interface RenderOptions {
  preloadedState?: RootState
  route?: string
}

// A fresh store per test with no saga (so no API calls); every dispatched action is recorded in `actions`
export function renderWithProviders(ui: ReactElement, { preloadedState = makeState(), route }: RenderOptions = {}) {
  const actions: UnknownAction[] = []
  const recorder: Middleware = () => (next) => (action) => {
    actions.push(action as UnknownAction)
    return next(action)
  }
  const store = createStore(rootReducer, preloadedState, applyMiddleware(recorder))
  // No timer between keystrokes: the form tests type into many fields and time out when the full suite runs in parallel
  const user = userEvent.setup({ delay: null })

  return {
    store,
    actions,
    user,
    ...render(
      <Provider store={store}>
        <FluentProvider theme={webLightTheme}>
          <MemoryRouter initialEntries={[route ?? '/']}>{ui}</MemoryRouter>
        </FluentProvider>
      </Provider>,
    ),
  }
}
