import type { Vendor } from '../../types/vendors'
import type { Part, PartBankAccountOption, PartVendorOption } from '../../types/parts'

// Accepted spellings per field: ASP.NET camelCase (part_Number) first, then camelCase, PascalCase and snake_case
const DTO_FIELDS = {
  id: ['id', 'Id', 'partId', 'PartId', 'part_id'],
  partNumber: ['part_Number', 'partNumber', 'PartNumber', 'Part_Number', 'part_number'],
  name: ['name', 'Name'],
  category: ['category', 'Category'],
  vendorId: ['vendor_Id', 'vendorId', 'VendorId', 'Vendor_Id', 'vendor_id'],
  costPrice: ['cost_Price', 'costPrice', 'CostPrice', 'Cost_Price', 'cost_price'],
  sellPrice: ['sell_Price', 'sellPrice', 'SellPrice', 'Sell_Price', 'sell_price'],
  quantity: ['quantity', 'Quantity'],
  reorderLevel: ['reorder_Level', 'reorderLevel', 'ReorderLevel', 'Reorder_Level', 'reorder_level'],
  warehouse: ['warehouse', 'Warehouse'],
  inventoryValue: ['inventory_Value', 'inventoryValue', 'InventoryValue', 'Inventory_Value', 'inventory_value'],
  isLowStock: ['is_Low_Stock', 'isLowStock', 'IsLowStock', 'Is_Low_Stock', 'is_low_stock'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type PartDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type PartDto = Partial<Record<PartDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'parts', 'bankAccounts', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: PartDto, field: DtoField): unknown {
  const keys: readonly PartDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: PartDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: PartDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function readBoolean(dto: PartDto, field: DtoField): boolean {
  const value = readField(dto, field)
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true')
}

// Without is_Low_Stock, fall back on the design's rule: at or below the reorder level
function readLowStock(dto: PartDto, quantity: number, reorderLevel: number): boolean {
  return readField(dto, 'isLowStock') === undefined ? quantity <= reorderLevel : readBoolean(dto, 'isLowStock')
}

export function mapPart(raw: unknown): Part {
  const dto: PartDto = isRecord(raw) ? raw : {}
  const quantity = readNumber(dto, 'quantity')
  const reorderLevel = readNumber(dto, 'reorderLevel')

  return {
    id: readString(dto, 'id'),
    partNumber: readString(dto, 'partNumber'),
    name: readString(dto, 'name'),
    category: readString(dto, 'category'),
    vendorId: readString(dto, 'vendorId'),
    costPrice: readNumber(dto, 'costPrice'),
    sellPrice: readNumber(dto, 'sellPrice'),
    quantity,
    reorderLevel,
    warehouse: readString(dto, 'warehouse'),
    inventoryValue: readNumber(dto, 'inventoryValue'),
    isLowStock: readLowStock(dto, quantity, reorderLevel),
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

export function mapPartCollection(body: unknown): Part[] {
  return unwrapCollection(body).filter(isRecord).map(mapPart)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// Every vendor type is kept for the Vendor column; the Receive Parts dropdown filters by type itself.
// Vendors without an id can't be matched to vendor_Id.
export function toPartVendorOptions(vendors: Vendor[]): PartVendorOption[] {
  return vendors.filter((vendor) => vendor.id).map((vendor) => ({ id: vendor.id, name: vendor.name, type: vendor.type }))
}

const readText = (record: Record<string, unknown>, keys: readonly string[]): string => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

// GetAllBankAccounts rows: { id, name, accountNumber, ... }; accounts without an id are left out
export function mapBankAccountOptions(body: unknown): PartBankAccountOption[] {
  return unwrapCollection(body)
    .filter(isRecord)
    .map((account) => ({
      id: readText(account, ['id', 'Id']),
      name: readText(account, ['name', 'Name']) || 'Unnamed account',
      accountNumber: readText(account, ['accountNumber', 'AccountNumber', 'account_Number']),
    }))
    .filter((account) => account.id)
}

// Body of PUT Part/UpdatePart (PartUpdateDto): the only field is the quantity received, a JSON integer of at least 1
export interface PartUpdateDto {
  quantity_Received: number
}

export const toPartUpdateDto = (quantity: number): PartUpdateDto => ({ quantity_Received: quantity })
