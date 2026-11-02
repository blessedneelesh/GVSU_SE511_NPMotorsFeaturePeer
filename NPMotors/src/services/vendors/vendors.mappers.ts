import type { Vendor, VendorFormValues, VendorStatus, VendorType } from '../../types/vendors'

// Accepted spellings per field: ASP.NET camelCase first, then PascalCase and snake_case
const DTO_FIELDS = {
  id: ['id', 'Id', 'vendorId', 'VendorId', 'vendor_id'],
  name: ['name', 'Name', 'vendorName', 'VendorName'],
  contact: ['contact', 'Contact', 'contactPerson', 'ContactPerson'],
  phone: ['phone', 'Phone'],
  email: ['email', 'Email'],
  address: ['address', 'Address'],
  type: ['type', 'Type', 'vendorType', 'VendorType'],
  balance: ['balance', 'Balance'],
  totalPurchases: ['totalPurchases', 'TotalPurchases', 'total_purchases'],
  status: ['status', 'Status'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type VendorDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type VendorDto = Partial<Record<VendorDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'vendors', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: VendorDto, field: DtoField): unknown {
  const keys: readonly VendorDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: VendorDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: VendorDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeStatus(value: unknown): VendorStatus {
  return typeof value === 'string' && value.trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active'
}

// The enum may arrive as its name ("parts") or, without a string converter, as its number (1)
const VENDOR_TYPES: readonly VendorType[] = ['vehicles', 'parts', 'service']

export function normalizeType(value: unknown): VendorType {
  if (typeof value === 'number') return VENDOR_TYPES[value] ?? 'vehicles'
  const name = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return VENDOR_TYPES.find((type) => type === name) ?? 'vehicles'
}

export function mapVendor(raw: unknown): Vendor {
  const dto: VendorDto = isRecord(raw) ? raw : {}

  return {
    id: readString(dto, 'id'),
    name: readString(dto, 'name') || 'Unnamed vendor',
    contact: readString(dto, 'contact'),
    phone: readString(dto, 'phone'),
    email: readString(dto, 'email'),
    address: readString(dto, 'address'),
    type: normalizeType(readField(dto, 'type')),
    balance: readNumber(dto, 'balance'),
    totalPurchases: readNumber(dto, 'totalPurchases'),
    status: normalizeStatus(readField(dto, 'status')),
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

export function mapVendorCollection(body: unknown): Vendor[] {
  return unwrapCollection(body).filter(isRecord).map(mapVendor)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// Body of POST Vendor/AddVendor (VendorCreateDto); optional columns are nullable, so send null rather than ''
export interface VendorCreateDto {
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  type: VendorType
  status: 'active' | 'inactive'
}

const orNull = (value: string) => value.trim() || null

export function toVendorCreateDto(values: VendorFormValues): VendorCreateDto {
  return {
    name: values.name.trim(),
    contact: orNull(values.contact),
    phone: orNull(values.phone),
    email: orNull(values.email.toLowerCase()),
    address: orNull(values.address),
    type: values.type,
    status: values.status === 'Inactive' ? 'inactive' : 'active',
  }
}
