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

// Builds a full RootState from each slice's initial state; tests override only what the scenario needs
export const makeState = (overrides: Partial<CustomersState> = {}, vendorOverrides: Partial<VendorsState> = {}): RootState => ({
  customers: { ...initialCustomersState, ...overrides },
  vendors: { ...initialVendorsState, ...vendorOverrides },
})

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
  const user = userEvent.setup()

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
