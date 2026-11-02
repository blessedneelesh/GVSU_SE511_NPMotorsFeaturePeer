import { VEHICLE_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { vendorsApi } from '../vendors/vendors.api'
import type { Vehicle, VehicleFormValues, VehiclePage, VehicleQuery, VehicleVendorOption } from '../../types/vehicles'
import { mapVehicle, mapVehicleCollection, readHasNext, toVehicleCreateDto, toVehicleVendorOptions } from './vehicles.mappers'

interface VehicleQueryParams {
  PageNumber: number
  PageSize: number
  Status?: string
  SearchTerm?: string
}

// Enough for every vehicle vendor in one request; GetAllVendors has no unpaged mode
const VENDOR_OPTIONS_PAGE_SIZE = 100

async function getVehicles(query: VehicleQuery, signal?: AbortSignal): Promise<VehiclePage> {
  const params: VehicleQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.status !== 'all') params.Status = query.status
  const searchTerm = query.searchTerm.trim()
  if (searchTerm) params.SearchTerm = searchTerm

  const { data } = await customerClient.get<unknown>(VEHICLE_ENDPOINTS.getAllVehicles, { params, signal })
  const items = mapVehicleCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getVehicleById(id: string, signal?: AbortSignal): Promise<Vehicle> {
  const { data } = await customerClient.get<unknown>(VEHICLE_ENDPOINTS.getVehicleById, { params: { id }, signal })
  return mapVehicle(data)
}

// The list is refetched afterwards, so the response body isn't needed
async function addVehicle(values: VehicleFormValues, signal?: AbortSignal): Promise<void> {
  await customerClient.post(VEHICLE_ENDPOINTS.addVehicle, toVehicleCreateDto(values), { signal })
}

// The design's Vendor / Seller dropdown lists vehicle vendors only
async function getVendorOptions(signal?: AbortSignal): Promise<VehicleVendorOption[]> {
  const page = await vendorsApi.getVendors({ pageNumber: 1, pageSize: VENDOR_OPTIONS_PAGE_SIZE, type: 'vehicles', searchTerm: '' }, signal)
  return toVehicleVendorOptions(page.items)
}

export const vehiclesApi = { getVehicles, getVehicleById, addVehicle, getVendorOptions }
