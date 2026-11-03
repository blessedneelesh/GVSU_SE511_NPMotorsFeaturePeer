import { BANK_ACCOUNT_ENDPOINTS, PART_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { vendorsApi } from '../vendors/vendors.api'
import type { Part, PartPage, PartQuery, PartReceiveOptions, PartVendorOption } from '../../types/parts'
import { mapBankAccountOptions, mapPart, mapPartCollection, readHasNext, toPartUpdateDto, toPartVendorOptions } from './parts.mappers'

interface PartQueryParams {
  PageNumber: number
  PageSize: number
  Category?: string
  LowStockOnly?: boolean
  SearchTerm?: string
}

// Enough for every vendor, part or bank account in one request; the GetAll endpoints have no unpaged mode
const OPTIONS_PAGE_SIZE = 100

async function getParts(query: PartQuery, signal?: AbortSignal): Promise<PartPage> {
  const params: PartQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.category !== 'all') params.Category = query.category
  if (query.stock === 'low') params.LowStockOnly = true
  const searchTerm = query.searchTerm.trim()
  if (searchTerm) params.SearchTerm = searchTerm

  const { data } = await customerClient.get<unknown>(PART_ENDPOINTS.getAllParts, { params, signal })
  const items = mapPartCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getPartById(id: string, signal?: AbortSignal): Promise<Part> {
  const { data } = await customerClient.get<unknown>(PART_ENDPOINTS.getPartById, { params: { id }, signal })
  return mapPart(data)
}

// Adds the quantity to the part's stock. The list is refetched afterwards, so the response body isn't needed.
async function receivePart(id: string, quantity: number, signal?: AbortSignal): Promise<void> {
  await customerClient.put(PART_ENDPOINTS.updatePart, toPartUpdateDto(quantity), { params: { id }, signal })
}

// Every vendor, not only parts vendors: existing parts may point at any of them, and the design's dropdown lists all
async function getVendorOptions(signal?: AbortSignal): Promise<PartVendorOption[]> {
  const page = await vendorsApi.getVendors({ pageNumber: 1, pageSize: OPTIONS_PAGE_SIZE, type: 'all', searchTerm: '' }, signal)
  return toPartVendorOptions(page.items)
}

// The Receive Parts form needs every part (the table only holds one page) and the bank accounts to pay from
async function getReceiveOptions(signal?: AbortSignal): Promise<PartReceiveOptions> {
  const [partsResponse, accountsResponse] = await Promise.all([
    customerClient.get<unknown>(PART_ENDPOINTS.getAllParts, { params: { PageNumber: 1, PageSize: OPTIONS_PAGE_SIZE }, signal }),
    customerClient.get<unknown>(BANK_ACCOUNT_ENDPOINTS.getAllBankAccounts, { params: { PageNumber: 1, PageSize: OPTIONS_PAGE_SIZE }, signal }),
  ])
  return { parts: mapPartCollection(partsResponse.data), bankAccounts: mapBankAccountOptions(accountsResponse.data) }
}

export const partsApi = { getParts, getPartById, receivePart, getVendorOptions, getReceiveOptions }
