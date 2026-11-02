import type { Vendor } from '../../types/vendors'
import type { Vehicle, VehicleFormValues, VehicleStatus, VehicleVendorOption } from '../../types/vehicles'

// Accepted spellings per field: ASP.NET camelCase (vendor_Id) first, then camelCase, PascalCase and snake_case
const DTO_FIELDS = {
  id: ['id', 'Id', 'vehicleId', 'VehicleId', 'vehicle_id'],
  vendorId: ['vendor_Id', 'vendorId', 'VendorId', 'Vendor_Id', 'vendor_id'],
  vendorName: ['vendor_Name', 'vendorName', 'VendorName', 'Vendor_Name', 'vendor_name'],
  vin: ['vin', 'Vin', 'VIN'],
  make: ['make', 'Make'],
  model: ['model', 'Model'],
  year: ['year', 'Year'],
  color: ['color', 'Color'],
  purchaseDate: ['purchase_Date', 'purchaseDate', 'PurchaseDate', 'Purchase_Date', 'purchase_date'],
  warehouse: ['warehouse', 'Warehouse'],
  purchasePrice: ['purchase_Price', 'purchasePrice', 'PurchasePrice', 'Purchase_Price', 'purchase_price'],
  additionalCosts: ['additional_Costs', 'additionalCosts', 'AdditionalCosts', 'Additional_Costs', 'additional_costs'],
  totalCost: ['total_Cost', 'totalCost', 'TotalCost', 'Total_Cost', 'total_cost'],
  sellingPrice: ['selling_Price', 'sellingPrice', 'SellingPrice', 'Selling_Price', 'selling_price'],
  grossProfit: ['gross_Profit', 'grossProfit', 'GrossProfit', 'Gross_Profit', 'gross_profit'],
  grossMargin: ['gross_Margin', 'grossMargin', 'GrossMargin', 'Gross_Margin', 'gross_margin'],
  isAvailable: ['is_Available', 'isAvailable', 'IsAvailable', 'Is_Available', 'is_available'],
  status: ['status', 'Status'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type VehicleDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type VehicleDto = Partial<Record<VehicleDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'vehicles', '$values'] as const

const VEHICLE_STATUSES: readonly VehicleStatus[] = ['available', 'reserved', 'sold']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: VehicleDto, field: DtoField): unknown {
  const keys: readonly VehicleDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: VehicleDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: VehicleDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function readBoolean(dto: VehicleDto, field: DtoField): boolean {
  const value = readField(dto, field)
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true')
}

// The API sends "2026-07-25T00:00:00"; the design shows the date part only
function readDate(dto: VehicleDto, field: DtoField): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(readString(dto, field))
  return match ? match[0] : ''
}

// Unknown statuses fall back on is_Available, so a new backend status still gets a sensible badge
export function normalizeStatus(value: unknown, isAvailable: boolean): VehicleStatus {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return VEHICLE_STATUSES.find((known) => known === status) ?? (isAvailable ? 'available' : 'sold')
}

export function mapVehicle(raw: unknown): Vehicle {
  const dto: VehicleDto = isRecord(raw) ? raw : {}
  const year = readNumber(dto, 'year')
  const make = readString(dto, 'make')
  const model = readString(dto, 'model')
  const isAvailable = readBoolean(dto, 'isAvailable')

  return {
    id: readString(dto, 'id'),
    vendorId: readString(dto, 'vendorId'),
    vendorName: readString(dto, 'vendorName'),
    vin: readString(dto, 'vin'),
    make,
    model,
    year,
    title: [year || '', make, model].join(' ').trim() || 'Unnamed vehicle',
    color: readString(dto, 'color'),
    purchaseDate: readDate(dto, 'purchaseDate'),
    warehouse: readString(dto, 'warehouse'),
    purchasePrice: readNumber(dto, 'purchasePrice'),
    additionalCosts: readNumber(dto, 'additionalCosts'),
    totalCost: readNumber(dto, 'totalCost'),
    sellingPrice: readNumber(dto, 'sellingPrice'),
    grossProfit: readNumber(dto, 'grossProfit'),
    grossMargin: readNumber(dto, 'grossMargin'),
    isAvailable,
    status: normalizeStatus(readField(dto, 'status'), isAvailable),
  }
}

function unwrapCollection(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (!isRecord(body)) return []
  for (const key of COLLECTION_KEYS) {
    const value = body[key]
    if (Array.isArray(value)) return value
    if (isRecord(value)) {
      const nested = unwrapCollection(value)
      if (nested.length) return nested
    }
  }
  return []
}

export function mapVehicleCollection(body: unknown): Vehicle[] {
  return unwrapCollection(body).filter(isRecord).map(mapVehicle)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// Vendors without an id can't be sent as vendor_Id, so they aren't offered
export function toVehicleVendorOptions(vendors: Vendor[]): VehicleVendorOption[] {
  return vendors.filter((vendor) => vendor.id).map((vendor) => ({ id: vendor.id, name: vendor.name }))
}

// Body of POST Vehicle/AddVehicle (VehicleCreateDto). Numbers must be JSON numbers. There is no status:
// the API decides it (a new vehicle is available).
export interface VehicleCreateDto {
  vendor_Id: number | null
  vin: string
  make: string | null
  model: string | null
  year: number | null
  color: string | null
  purchase_Date: string | null
  warehouse: string | null
  purchase_Price: number | null
  additional_Costs: number | null
  selling_Price: number | null
}

const orNull = (value: string) => value.trim() || null

const toNumberOrNull = (value: string) => {
  const trimmed = value.trim()
  const parsed = trimmed ? Number(trimmed) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

export function toVehicleCreateDto(values: VehicleFormValues): VehicleCreateDto {
  return {
    vendor_Id: toNumberOrNull(values.vendorId),
    vin: values.vin.trim().toUpperCase(),
    make: orNull(values.make),
    model: orNull(values.model),
    year: toNumberOrNull(values.year),
    color: orNull(values.color),
    // <input type="date"> gives YYYY-MM-DD, which ASP.NET binds to DateTime
    purchase_Date: orNull(values.purchaseDate),
    warehouse: orNull(values.warehouse),
    purchase_Price: toNumberOrNull(values.purchasePrice),
    additional_Costs: toNumberOrNull(values.additionalCosts),
    selling_Price: toNumberOrNull(values.sellingPrice),
  }
}
