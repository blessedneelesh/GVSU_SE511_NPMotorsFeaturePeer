import { VEHICLE_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { bankAccountsApi } from '../bankAccounts/bankAccounts.api'
import { vendorsApi } from '../vendors/vendors.api'
import type {
  Vehicle,
  VehicleBankAccountOption,
  VehiclePage,
  VehiclePurchaseFormValues,
  VehiclePurchaseResult,
  VehicleQuery,
  VehicleVendorOption,
} from '../../types/vehicles'
import {
  mapVehicle,
  mapVehicleCollection,
  mapVehiclePurchaseResult,
  readHasNext,
  toVehicleBankAccountOptions,
  toVehiclePurchaseDto,
  toVehicleVendorOptions,
} from './vehicles.mappers'

interface VehicleQueryParams {
  PageNumber: number
  PageSize: number
  Status?: string
  SearchTerm?: string
}

// Enough for every vehicle vendor or bank account in one request; neither list endpoint has an unpaged mode
const OPTIONS_PAGE_SIZE = 100

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

// The design's Vendor / Seller dropdown lists vehicle vendors only
async function getVendorOptions(signal?: AbortSignal): Promise<VehicleVendorOption[]> {
  const page = await vendorsApi.getVendors({ pageNumber: 1, pageSize: OPTIONS_PAGE_SIZE, type: 'vehicles', searchTerm: '' }, signal)
  return toVehicleVendorOptions(page.items)
}

// Adds the vehicle and records the payment and/or AP bill in one call
async function purchaseVehicle(values: VehiclePurchaseFormValues, signal?: AbortSignal): Promise<VehiclePurchaseResult> {
  const { data } = await customerClient.post<unknown>(VEHICLE_ENDPOINTS.purchaseVehicle, toVehiclePurchaseDto(values), { signal })
  return mapVehiclePurchaseResult(data)
}

// The Purchase Vehicle "Bank Account" list: every active account, in one request
async function getBankAccountOptions(signal?: AbortSignal): Promise<VehicleBankAccountOption[]> {
  const page = await bankAccountsApi.getBankAccounts({ pageNumber: 1, pageSize: OPTIONS_PAGE_SIZE, bankId: 'all', searchTerm: '' }, signal)
  return toVehicleBankAccountOptions(page.items)
}

export const vehiclesApi = { getVehicles, getVehicleById, getVendorOptions, purchaseVehicle, getBankAccountOptions }
