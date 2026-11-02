import type { Customer, CustomerFormValues, CustomerPage, CustomerSaveError, CustomerStatusFilter } from '../../types/customers'
import { CUSTOMER_ACTIONS } from './customers.constants'

export const loadCustomers = () => ({ type: CUSTOMER_ACTIONS.LOAD })

export const loadCustomersSuccess = (page: CustomerPage) => ({ type: CUSTOMER_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadCustomersFailure = (message: string) => ({ type: CUSTOMER_ACTIONS.LOAD_FAILURE, payload: message })

export const setCustomerSearch = (searchTerm: string) => ({ type: CUSTOMER_ACTIONS.SET_SEARCH, payload: searchTerm })

export const setCustomerStatusFilter = (status: CustomerStatusFilter) => ({ type: CUSTOMER_ACTIONS.SET_STATUS_FILTER, payload: status })

export const setCustomerPage = (pageNumber: number) => ({ type: CUSTOMER_ACTIONS.SET_PAGE, payload: pageNumber })

export const setCustomerPageSize = (pageSize: number) => ({ type: CUSTOMER_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and fetches the customer by id
export const selectCustomer = (id: string) => ({ type: CUSTOMER_ACTIONS.SELECT, payload: id })

export const clearCustomerSelection = () => ({ type: CUSTOMER_ACTIONS.CLEAR_SELECTION })

export const loadCustomerByIdSuccess = (customer: Customer) => ({ type: CUSTOMER_ACTIONS.LOAD_BY_ID_SUCCESS, payload: customer })

export const loadCustomerByIdFailure = (message: string) => ({ type: CUSTOMER_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

export const createCustomer = (values: CustomerFormValues) => ({ type: CUSTOMER_ACTIONS.CREATE, payload: values })

export const createCustomerSuccess = () => ({ type: CUSTOMER_ACTIONS.CREATE_SUCCESS })

export const createCustomerFailure = (error: CustomerSaveError) => ({ type: CUSTOMER_ACTIONS.CREATE_FAILURE, payload: error })

// Clears the save status and errors, e.g. when the form is opened or closed or the success banner is dismissed
export const resetCustomerSave = () => ({ type: CUSTOMER_ACTIONS.RESET_SAVE })

export type CustomersAction =
  | ReturnType<typeof loadCustomers>
  | ReturnType<typeof loadCustomersSuccess>
  | ReturnType<typeof loadCustomersFailure>
  | ReturnType<typeof setCustomerSearch>
  | ReturnType<typeof setCustomerStatusFilter>
  | ReturnType<typeof setCustomerPage>
  | ReturnType<typeof setCustomerPageSize>
  | ReturnType<typeof selectCustomer>
  | ReturnType<typeof clearCustomerSelection>
  | ReturnType<typeof loadCustomerByIdSuccess>
  | ReturnType<typeof loadCustomerByIdFailure>
  | ReturnType<typeof createCustomer>
  | ReturnType<typeof createCustomerSuccess>
  | ReturnType<typeof createCustomerFailure>
  | ReturnType<typeof resetCustomerSave>
