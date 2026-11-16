import type { Customer } from '../../types/customers'
import type { Receivable, ReceivableAgingStatus, ReceivableCustomerOption, ReceivableDetail } from '../../types/receivables'

// Accepted spellings per field: the API's snake-ish camelCase first, then camelCase and PascalCase.
// GetAllAr and GetArById name some fields differently (customer_Name vs customer, days_Overdue vs days), so both are listed.
const DTO_FIELDS = {
  id: ['id', 'Id', 'arInvoiceId', 'ArInvoiceId'],
  invoiceId: ['invoiceId', 'InvoiceId', 'invoice_Id', 'Invoice_Id'],
  number: ['number', 'Number'],
  customerId: ['customerId', 'CustomerId', 'customer_Id', 'Customer_Id'],
  customerName: ['customer_Name', 'customer', 'customerName', 'CustomerName', 'Customer_Name', 'Customer'],
  invoiceNumber: ['invoice_Number', 'invoiceNumber', 'InvoiceNumber', 'Invoice_Number'],
  date: ['date', 'Date', 'invoice_Date', 'invoiceDate', 'InvoiceDate', 'Invoice_Date'],
  dueDate: ['due_Date', 'dueDate', 'DueDate', 'Due_Date'],
  amount: ['amount', 'Amount'],
  paid: ['paid', 'Paid'],
  balance: ['balance', 'Balance'],
  invoiceTotal: ['invoice_Total', 'invoiceTotal', 'InvoiceTotal', 'Invoice_Total'],
  status: ['status', 'Status'],
  daysOverdue: ['days_Overdue', 'days', 'daysOverdue', 'DaysOverdue', 'Days_Overdue', 'Days'],
  agingStatus: ['aging_Status', 'agingStatus', 'AgingStatus', 'Aging_Status'],
  phone: ['phone', 'Phone'],
  email: ['email', 'Email'],
  address: ['address', 'Address'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type ReceivableDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type ReceivableDto = Partial<Record<ReceivableDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'receivables', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: ReceivableDto, field: DtoField): unknown {
  const keys: readonly ReceivableDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: ReceivableDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: ReceivableDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

// The API mixes "Partial" and "partial"; aging_Status is "Overdue" once past due, else the AR status
export function normalizeAgingStatus(value: unknown): ReceivableAgingStatus {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (status === 'overdue') return 'Overdue'
  if (status === 'partial') return 'Partial'
  if (status === 'paid') return 'Paid'
  return 'Unpaid'
}

// "2024-03-22T00:00:00" -> "2024-03-22"; the time is always midnight
const toDateOnly = (value: string) => value.slice(0, 10)

const readDays = (dto: ReceivableDto) => Math.max(0, Math.trunc(readNumber(dto, 'daysOverdue')))

// aging_Status when the API sends it; otherwise derived the way GetAllAr does:
// a paid invoice stays Paid, anything else past due is Overdue, else the AR status
function readAgingStatus(dto: ReceivableDto, daysOverdue: number): ReceivableAgingStatus {
  const agingStatus = readField(dto, 'agingStatus')
  if (agingStatus !== undefined) return normalizeAgingStatus(agingStatus)
  const status = normalizeAgingStatus(readField(dto, 'status'))
  return status !== 'Paid' && daysOverdue > 0 ? 'Overdue' : status
}

export function mapReceivable(raw: unknown): Receivable {
  const dto: ReceivableDto = isRecord(raw) ? raw : {}
  const daysOverdue = readDays(dto)
  const agingStatus = readAgingStatus(dto, daysOverdue)

  return {
    id: readString(dto, 'id'),
    number: readString(dto, 'number'),
    customerId: readString(dto, 'customerId'),
    customerName: readString(dto, 'customerName'),
    invoiceNumber: readString(dto, 'invoiceNumber'),
    dueDate: toDateOnly(readString(dto, 'dueDate')),
    amount: readNumber(dto, 'amount'),
    paid: readNumber(dto, 'paid'),
    balance: readNumber(dto, 'balance'),
    daysOverdue,
    agingStatus,
  }
}

// GetArById returns a bare object (no envelope); 404 when the id is unknown
export function mapReceivableDetail(raw: unknown): ReceivableDetail {
  const dto: ReceivableDto = isRecord(raw) ? raw : {}
  const daysOverdue = readDays(dto)

  return {
    id: readString(dto, 'id'),
    invoiceId: readString(dto, 'invoiceId'),
    number: readString(dto, 'number'),
    customerName: readString(dto, 'customerName'),
    date: toDateOnly(readString(dto, 'date')),
    dueDate: toDateOnly(readString(dto, 'dueDate')),
    amount: readNumber(dto, 'amount'),
    paid: readNumber(dto, 'paid'),
    balance: readNumber(dto, 'balance'),
    invoiceTotal: readNumber(dto, 'invoiceTotal'),
    daysOverdue,
    agingStatus: readAgingStatus(dto, daysOverdue),
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

export function mapReceivableCollection(body: unknown): Receivable[] {
  return unwrapCollection(body).filter(isRecord).map(mapReceivable)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// Customers without an id can't be filtered on, so they're left out; sorted by name for the dropdown
export function toReceivableCustomerOptions(customers: Customer[]): ReceivableCustomerOption[] {
  return customers
    .filter((customer) => customer.id)
    .map((customer) => ({ id: customer.id, name: customer.fullName }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
