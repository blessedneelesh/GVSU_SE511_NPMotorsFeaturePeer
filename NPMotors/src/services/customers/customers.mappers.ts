import type { Customer, CustomerStatus } from '../../types/customers'

// Accepted spellings per field: ASP.NET camelCase (first_Name), plain camelCase, PascalCase and snake_case
const DTO_FIELDS = {
  id: ['id', 'Id', 'customerId', 'CustomerId', 'customer_id'],
  firstName: ['first_Name', 'firstName', 'FirstName', 'First_Name', 'first_name'],
  lastName: ['last_Name', 'lastName', 'LastName', 'Last_Name', 'last_name'],
  email: ['email', 'Email'],
  phone: ['phone', 'Phone'],
  address: ['address', 'Address'],
  city: ['city', 'City'],
  state: ['state', 'State'],
  zip: ['zip', 'Zip', 'zipCode', 'ZipCode'],
  balance: ['balance', 'Balance'],
  totalPurchases: ['totalPurchases', 'TotalPurchases', 'total_purchases'],
  status: ['status', 'Status'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type CustomerDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type CustomerDto = Partial<Record<CustomerDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'customers', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: CustomerDto, field: DtoField): unknown {
  const keys: readonly CustomerDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: CustomerDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: CustomerDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeStatus(value: unknown): CustomerStatus {
  return typeof value === 'string' && value.trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active'
}

export function mapCustomer(raw: unknown): Customer {
  const dto: CustomerDto = isRecord(raw) ? raw : {}
  const firstName = readString(dto, 'firstName')
  const lastName = readString(dto, 'lastName')

  return {
    id: readString(dto, 'id'),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || 'Unnamed customer',
    email: readString(dto, 'email'),
    phone: readString(dto, 'phone'),
    address: readString(dto, 'address'),
    city: readString(dto, 'city'),
    state: readString(dto, 'state'),
    zip: readString(dto, 'zip'),
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

export function mapCustomerCollection(body: unknown): Customer[] {
  return unwrapCollection(body).filter(isRecord).map(mapCustomer)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}
