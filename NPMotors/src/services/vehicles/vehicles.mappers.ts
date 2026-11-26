import type { BankAccount } from '../../types/bankAccounts'
import type { Vendor } from '../../types/vendors'
import type {
  Vehicle,
  VehicleBankAccountOption,
  VehiclePaymentCondition,
  VehiclePaymentMethod,
  VehiclePurchaseFormValues,
  VehiclePurchaseResult,
  VehicleStatus,
  VehicleVendorOption,
} from '../../types/vehicles'

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
  // PurchaseVehicle response only (VehiclePurchaseResponseDto)
  amountPaid: ['amount_Paid', 'amountPaid', 'AmountPaid', 'Amount_Paid', 'amount_paid'],
  paymentStatus: ['payment_Status', 'paymentStatus', 'PaymentStatus', 'Payment_Status', 'payment_status'],
  apBillNumber: ['ap_Bill_Number', 'apBillNumber', 'ApBillNumber', 'Ap_Bill_Number', 'ap_bill_number'],
  paymentNumber: ['payment_Number', 'paymentNumber', 'PaymentNumber', 'Payment_Number', 'payment_number'],
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

// The vehicle half of the PurchaseVehicle body (the API's VehicleCreateDto). Numbers must be JSON numbers. There
// is no status: the API decides it (a new vehicle is available).
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

// Only active accounts can be paid from; accounts without an id can't be sent as bank_Account_Id
export function toVehicleBankAccountOptions(accounts: BankAccount[]): VehicleBankAccountOption[] {
  return accounts
    .filter((account) => account.id && account.status === 'Active')
    .map((account) => ({ id: account.id, name: account.name, bankName: account.bankName, bookBalance: account.bookBalance }))
}

// Amounts are handled in whole cents, so purchase price + additional costs is exact. The API checks that a
// paid-in-full amount equals that total to the cent, and 0.1 + 0.2 in floating point would not.
export function toCents(value: string): number {
  const trimmed = value.trim()
  const parsed = trimmed ? Number(trimmed) : NaN
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

// The design's sales tax, transport and other costs, which the API stores as one additional_Costs figure
export const additionalCostCents = (values: VehiclePurchaseFormValues) =>
  toCents(values.salesTax) + toCents(values.transportCost) + toCents(values.otherCosts)

export const totalCostCents = (values: VehiclePurchaseFormValues) => toCents(values.purchasePrice) + additionalCostCents(values)

// What the purchase pays now: everything, the entered part, or nothing
export function amountPaidCents(values: VehiclePurchaseFormValues): number {
  if (values.paymentCondition === 'paidInFull') return totalCostCents(values)
  if (values.paymentCondition === 'partial') return toCents(values.amountPaid)
  return 0
}

// Body of POST Vehicle/PurchaseVehicle (VehiclePurchaseCreateDto): VehicleCreateDto plus the payment. The condition
// and method are PascalCase strings the API checks with a regex. Nothing paid (credit) sends no method or account;
// a due date is only meaningful when some of the cost is left on account.
export interface VehiclePurchaseCreateDto extends VehicleCreateDto {
  payment_Condition: 'PaidInFull' | 'Partial' | 'Credit'
  amount_Paid: number
  payment_Method: 'Cash' | 'Check' | 'Card' | 'Transfer' | null
  reference: string | null
  bank_Account_Id: number | null
  due_Date: string | null
}

const PAYMENT_CONDITIONS: Record<VehiclePaymentCondition, VehiclePurchaseCreateDto['payment_Condition']> = {
  paidInFull: 'PaidInFull',
  partial: 'Partial',
  credit: 'Credit',
}

const PAYMENT_METHODS: Record<VehiclePaymentMethod, NonNullable<VehiclePurchaseCreateDto['payment_Method']>> = {
  cash: 'Cash',
  check: 'Check',
  card: 'Card',
  transfer: 'Transfer',
}

export function toVehiclePurchaseDto(values: VehiclePurchaseFormValues): VehiclePurchaseCreateDto {
  const isCredit = values.paymentCondition === 'credit'
  return {
    vendor_Id: toNumberOrNull(values.vendorId),
    vin: values.vin.trim().toUpperCase(),
    make: orNull(values.make),
    model: orNull(values.model),
    year: toNumberOrNull(values.year),
    color: orNull(values.color),
    purchase_Date: orNull(values.purchaseDate),
    warehouse: orNull(values.warehouse),
    purchase_Price: toCents(values.purchasePrice) / 100,
    additional_Costs: additionalCostCents(values) / 100,
    selling_Price: toNumberOrNull(values.sellingPrice),
    payment_Condition: PAYMENT_CONDITIONS[values.paymentCondition],
    amount_Paid: amountPaidCents(values) / 100,
    payment_Method: isCredit ? null : PAYMENT_METHODS[values.paymentMethod],
    reference: isCredit ? null : orNull(values.reference),
    bank_Account_Id: isCredit ? null : toNumberOrNull(values.bankAccountId),
    due_Date: values.paymentCondition === 'paidInFull' ? null : orNull(values.dueDate),
  }
}

// PurchaseVehicle answers 201 with the vehicle (VehicleResponseDto fields) plus the payment outcome
export function mapVehiclePurchaseResult(raw: unknown): VehiclePurchaseResult {
  const dto: VehicleDto = isRecord(raw) ? raw : {}
  const vehicle = mapVehicle(raw)
  // The API leaves Total_Cost at 0 on this response (and so sends Balance_Due as -Amount_Paid), so both are
  // worked out from the stored price and costs instead
  const totalCost = readNumber(dto, 'totalCost') || (Math.round(vehicle.purchasePrice * 100) + Math.round(vehicle.additionalCosts * 100)) / 100
  const amountPaid = readNumber(dto, 'amountPaid')
  return {
    vehicleId: vehicle.id,
    title: vehicle.title,
    totalCost,
    amountPaid,
    balanceDue: Math.max(0, Math.round((totalCost - amountPaid) * 100) / 100),
    paymentStatus: readString(dto, 'paymentStatus').toLowerCase(),
    apBillNumber: readString(dto, 'apBillNumber'),
    paymentNumber: readString(dto, 'paymentNumber'),
  }
}
