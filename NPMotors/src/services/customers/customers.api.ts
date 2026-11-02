import { CUSTOMER_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import type { Customer, CustomerFormValues, CustomerPage, CustomerQuery } from '../../types/customers'
import { mapCustomer, mapCustomerCollection, readHasNext, toCustomerCreateDto } from './customers.mappers'

interface CustomerQueryParams {
  PageNumber: number
  PageSize: number
  Status?: string
  SearchTerm?: string
}

async function getCustomers(query: CustomerQuery, signal?: AbortSignal): Promise<CustomerPage> {
  const params: CustomerQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.status !== 'all') params.Status = query.status
  const searchTerm = query.searchTerm.trim()
  if (searchTerm) params.SearchTerm = searchTerm

  const { data } = await customerClient.get<unknown>(CUSTOMER_ENDPOINTS.getAllCustomers, { params, signal })
  const items = mapCustomerCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getCustomerById(id: string, signal?: AbortSignal): Promise<Customer> {
  const { data } = await customerClient.get<unknown>(CUSTOMER_ENDPOINTS.getCustomerById, { params: { id }, signal })
  return mapCustomer(data)
}

// The list is refetched afterwards, so the response body isn't needed
async function addCustomer(values: CustomerFormValues, signal?: AbortSignal): Promise<void> {
  await customerClient.post(CUSTOMER_ENDPOINTS.addCustomer, toCustomerCreateDto(values), { signal })
}

export const customersApi = { getCustomers, getCustomerById, addCustomer }
