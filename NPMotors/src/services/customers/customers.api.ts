import { CUSTOMER_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import type { CustomerPage, CustomerQuery } from '../../types/customers'
import { mapCustomerCollection, readHasNext } from './customers.mappers'

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

export const customersApi = { getCustomers }
