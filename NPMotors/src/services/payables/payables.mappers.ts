import type { Vendor } from '../../types/vendors'
import type { PaymentMethod } from '../../types/common'
import type {
  Payable,
  PayableAgingBucket,
  PayableDetail,
  PayablePayment,
  PayableStatus,
  PayableVendorOption,
} from '../../types/payables'

// Accepted spellings per field: the API's snake-ish camelCase first, then camelCase and PascalCase.
// GetAllApBills and GetApById name some fields differently (vendor_Name vs vendor, days_Overdue vs days), so both are listed.
const DTO_FIELDS = {
  id: ['id', 'Id', 'apBillId', 'ApBillId'],
  number: ['number', 'Number'],
  vendorId: ['vendor_Id', 'vendorId', 'VendorId', 'Vendor_Id'],
  vendorName: ['vendor_Name', 'vendorName', 'VendorName', 'Vendor_Name', 'vendor', 'Vendor'],
  date: ['date', 'Date', 'bill_Date', 'billDate', 'BillDate', 'Bill_Date'],
  dueDate: ['due_Date', 'dueDate', 'DueDate', 'Due_Date'],
  amount: ['amount', 'Amount'],
  paid: ['paid', 'Paid'],
  balance: ['balance', 'Balance'],
  vehicleId: ['vehicle_Id', 'vehicleId', 'VehicleId', 'Vehicle_Id'],
  daysOverdue: ['days_Overdue', 'days', 'daysOverdue', 'DaysOverdue', 'Days_Overdue', 'Days'],
  agingBucket: ['aging_Bucket', 'agingBucket', 'AgingBucket', 'Aging_Bucket'],
  status: ['status', 'Status'],
  contact: ['contact', 'Contact', 'contact_Name', 'contactName', 'ContactName'],
  phone: ['phone', 'Phone'],
  email: ['email', 'Email'],
  address: ['address', 'Address'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type PayableDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type PayableDto = Partial<Record<PayableDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'payables', 'apBills', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: PayableDto, field: DtoField): unknown {
  const keys: readonly PayableDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: PayableDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: PayableDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

// The API mixes "Unpaid" and "unpaid"; status is "Overdue" once past due, else the bill's own status
export function normalizePayableStatus(value: unknown): PayableStatus {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (status === 'overdue') return 'Overdue'
  if (status === 'partial') return 'Partial'
  if (status === 'paid') return 'Paid'
  return 'Unpaid'
}

const AGING_BUCKETS: readonly PayableAgingBucket[] = ['Current', '1-30', '31-60', '61-90', 'Over 90']

// The days' bucket, the way GetAllApBills computes aging_Bucket
export const agingBucketForDays = (days: number): PayableAgingBucket =>
  days <= 0 ? 'Current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : 'Over 90'

// aging_Bucket when the API sends a known one (case-insensitive), otherwise derived from the days
export function normalizeAgingBucket(value: unknown, days: number): PayableAgingBucket {
  const bucket = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return AGING_BUCKETS.find((known) => known.toLowerCase() === bucket) ?? agingBucketForDays(days)
}

// "2024-03-12T00:00:00" -> "2024-03-12"; the time is always midnight
const toDateOnly = (value: string) => value.slice(0, 10)

const readDays = (dto: PayableDto) => Math.max(0, Math.trunc(readNumber(dto, 'daysOverdue')))

export function mapPayable(raw: unknown): Payable {
  const dto: PayableDto = isRecord(raw) ? raw : {}
  const daysOverdue = readDays(dto)

  return {
    id: readString(dto, 'id'),
    number: readString(dto, 'number'),
    vendorId: readString(dto, 'vendorId'),
    vendorName: readString(dto, 'vendorName'),
    date: toDateOnly(readString(dto, 'date')),
    dueDate: toDateOnly(readString(dto, 'dueDate')),
    amount: readNumber(dto, 'amount'),
    paid: readNumber(dto, 'paid'),
    balance: readNumber(dto, 'balance'),
    daysOverdue,
    agingBucket: normalizeAgingBucket(readField(dto, 'agingBucket'), daysOverdue),
    status: normalizePayableStatus(readField(dto, 'status')),
  }
}

// GetApById returns a bare object (no envelope) with the stored status ("Unpaid" even when long past due), so the
// status is derived as GetAllApBills does: anything unsettled and past due is Overdue
export function mapPayableDetail(raw: unknown): PayableDetail {
  const dto: PayableDto = isRecord(raw) ? raw : {}
  const daysOverdue = readDays(dto)
  const balance = readNumber(dto, 'balance')
  const stored = normalizePayableStatus(readField(dto, 'status'))

  return {
    id: readString(dto, 'id'),
    number: readString(dto, 'number'),
    vendorId: readString(dto, 'vendorId'),
    vendorName: readString(dto, 'vendorName'),
    vehicleId: readString(dto, 'vehicleId'),
    date: toDateOnly(readString(dto, 'date')),
    dueDate: toDateOnly(readString(dto, 'dueDate')),
    amount: readNumber(dto, 'amount'),
    paid: readNumber(dto, 'paid'),
    balance,
    daysOverdue,
    status: stored !== 'Paid' && balance > 0 && daysOverdue > 0 ? 'Overdue' : stored,
    contact: readString(dto, 'contact'),
    phone: readString(dto, 'phone'),
    email: readString(dto, 'email'),
    address: readString(dto, 'address'),
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

export function mapPayableCollection(body: unknown): Payable[] {
  return unwrapCollection(body).filter(isRecord).map(mapPayable)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// Vendors without an id can't be filtered on, so they're left out; sorted by name for the dropdown.
// Every vendor type is offered: bills come from vehicle, parts and service vendors alike.
export function toPayableVendorOptions(vendors: Vendor[]): PayableVendorOption[] {
  return vendors
    .filter((vendor) => vendor.id)
    .map((vendor) => ({ id: vendor.id, name: vendor.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// GetPaymentHistory's payment fields, spelled as the API sends them first
const PAYMENT_FIELDS = {
  id: ['id', 'Id', 'payment_Id', 'paymentId', 'PaymentId'],
  paymentNumber: ['payment_Number', 'paymentNumber', 'PaymentNumber', 'Payment_Number', 'number', 'Number'],
  paymentDate: ['payment_Date', 'paymentDate', 'PaymentDate', 'Payment_Date', 'date', 'Date'],
  paymentMethod: ['payment_Method', 'paymentMethod', 'PaymentMethod', 'Payment_Method', 'method', 'Method'],
  reference: ['reference', 'Reference'],
  amount: ['amount', 'Amount'],
} as const

type PaymentField = keyof typeof PAYMENT_FIELDS

function readPaymentField(dto: Record<string, unknown>, field: PaymentField): unknown {
  for (const key of PAYMENT_FIELDS[field]) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readPaymentString(dto: Record<string, unknown>, field: PaymentField): string {
  const value = readPaymentField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'transfer', 'check']

// The API sends "Check", "Card", "Cash" and "Transfer"
function readPaymentMethod(dto: Record<string, unknown>): PaymentMethod | null {
  const value = readPaymentString(dto, 'paymentMethod').toLowerCase()
  return PAYMENT_METHODS.find((method) => method === value) ?? null
}

export function mapPayablePayment(dto: Record<string, unknown>): PayablePayment {
  const amount = readPaymentField(dto, 'amount')
  const parsed = typeof amount === 'number' ? amount : typeof amount === 'string' && amount.trim() ? Number(amount) : NaN
  return {
    id: readPaymentString(dto, 'id'),
    paymentNumber: readPaymentString(dto, 'paymentNumber'),
    paymentDate: toDateOnly(readPaymentString(dto, 'paymentDate')),
    paymentMethod: readPaymentMethod(dto),
    reference: readPaymentString(dto, 'reference'),
    amount: Number.isFinite(parsed) ? parsed : 0,
  }
}

// GetPaymentHistory returns the whole bill with its payments in a "payments" array; a bare array is accepted too
export function mapPayablePaymentHistory(body: unknown): PayablePayment[] {
  const list = Array.isArray(body) ? body : isRecord(body) ? (body.payments ?? body.Payments) : undefined
  return Array.isArray(list) ? list.filter(isRecord).map(mapPayablePayment) : []
}
