import { AR_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { customersApi } from '../customers/customers.api'
import type { ReceivableCustomerOption, ReceivablePage, ReceivableQuery } from '../../types/receivables'
import { mapReceivableCollection, readHasNext, toReceivableCustomerOptions } from './receivables.mappers'

interface ReceivableQueryParams {
  PageNumber: number
  PageSize: number
  Status?: string
  CustomerId?: string
  AsOfDate?: string
}

// The API's largest page; customers past the first 100 won't be in the filter
const CUSTOMER_OPTIONS_PAGE_SIZE = 100

async function getReceivables(query: ReceivableQuery, signal?: AbortSignal): Promise<ReceivablePage> {
  const params: ReceivableQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.status !== 'all') params.Status = query.status
  if (query.customerId !== 'all') params.CustomerId = query.customerId
  if (query.asOfDate) params.AsOfDate = query.asOfDate

  const { data } = await customerClient.get<unknown>(AR_ENDPOINTS.getAllAr, { params, signal })
  const items = mapReceivableCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getCustomerOptions(signal?: AbortSignal): Promise<ReceivableCustomerOption[]> {
  const page = await customersApi.getCustomers({ pageNumber: 1, pageSize: CUSTOMER_OPTIONS_PAGE_SIZE, status: 'all', searchTerm: '' }, signal)
  return toReceivableCustomerOptions(page.items)
}

export const receivablesApi = { getReceivables, getCustomerOptions }
