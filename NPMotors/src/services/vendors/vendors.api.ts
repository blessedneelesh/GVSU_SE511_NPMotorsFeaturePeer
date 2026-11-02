import { VENDOR_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import type { Vendor, VendorFormValues, VendorPage, VendorQuery } from '../../types/vendors'
import { mapVendor, mapVendorCollection, readHasNext, toVendorCreateDto } from './vendors.mappers'

interface VendorQueryParams {
  PageNumber: number
  PageSize: number
  Type?: string
  SearchTerm?: string
}

async function getVendors(query: VendorQuery, signal?: AbortSignal): Promise<VendorPage> {
  const params: VendorQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.type !== 'all') params.Type = query.type
  const searchTerm = query.searchTerm.trim()
  if (searchTerm) params.SearchTerm = searchTerm

  const { data } = await customerClient.get<unknown>(VENDOR_ENDPOINTS.getAllVendors, { params, signal })
  const items = mapVendorCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getVendorById(id: string, signal?: AbortSignal): Promise<Vendor> {
  const { data } = await customerClient.get<unknown>(VENDOR_ENDPOINTS.getVendorById, { params: { id }, signal })
  return mapVendor(data)
}

// The list is refetched afterwards, so the response body isn't needed
async function addVendor(values: VendorFormValues, signal?: AbortSignal): Promise<void> {
  await customerClient.post(VENDOR_ENDPOINTS.addVendor, toVendorCreateDto(values), { signal })
}

export const vendorsApi = { getVendors, getVendorById, addVendor }
