import type { CustomerPage, CustomerStatusFilter } from '../../types/customers'
import { CUSTOMER_ACTIONS } from './customers.constants'

export const loadCustomers = () => ({ type: CUSTOMER_ACTIONS.LOAD })

export const loadCustomersSuccess = (page: CustomerPage) => ({ type: CUSTOMER_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadCustomersFailure = (message: string) => ({ type: CUSTOMER_ACTIONS.LOAD_FAILURE, payload: message })

export const setCustomerSearch = (searchTerm: string) => ({ type: CUSTOMER_ACTIONS.SET_SEARCH, payload: searchTerm })

export const setCustomerStatusFilter = (status: CustomerStatusFilter) => ({ type: CUSTOMER_ACTIONS.SET_STATUS_FILTER, payload: status })

export const setCustomerPage = (pageNumber: number) => ({ type: CUSTOMER_ACTIONS.SET_PAGE, payload: pageNumber })

export const setCustomerPageSize = (pageSize: number) => ({ type: CUSTOMER_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

export type CustomersAction =
  | ReturnType<typeof loadCustomers>
  | ReturnType<typeof loadCustomersSuccess>
  | ReturnType<typeof loadCustomersFailure>
  | ReturnType<typeof setCustomerSearch>
  | ReturnType<typeof setCustomerStatusFilter>
  | ReturnType<typeof setCustomerPage>
  | ReturnType<typeof setCustomerPageSize>
