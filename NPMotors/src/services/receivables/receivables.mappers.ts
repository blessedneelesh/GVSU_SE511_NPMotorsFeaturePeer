import type { Customer } from '../../types/customers'
import type { Receivable, ReceivableAgingStatus, ReceivableCustomerOption } from '../../types/receivables'

// Accepted spellings per field: the API's snake-ish camelCase first, then camelCase and PascalCase
const DTO_FIELDS = {
  id: ['id', 'Id', 'arInvoiceId', 'ArInvoiceId'],
  number: ['number', 'Number'],
  customerId: ['customerId', 'CustomerId', 'customer_Id', 'Customer_Id'],
  customerName: ['customer_Name', 'customerName', 'CustomerName', 'Customer_Name'],
  invoiceNumber: ['invoice_Number', 'invoiceNumber', 'InvoiceNumber', 'Invoice_Number'],
  dueDate: ['due_Date', 'dueDate', 'DueDate', 'Due_Date'],
  amount: ['amount', 'Amount'],
  paid: ['paid', 'Paid'],
  balance: ['balance', 'Balance'],
  status: ['status', 'Status'],
  daysOverdue: ['days_Overdue', 'daysOverdue', 'DaysOverdue', 'Days_Overdue'],
  agingStatus: ['aging_Status', 'agingStatus', 'AgingStatus', 'Aging_Status'],
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

export function mapReceivable(raw: unknown): Receivable {
  const dto: ReceivableDto = isRecord(raw) ? raw : {}
  const daysOverdue = Math.max(0, Math.trunc(readNumber(dto, 'daysOverdue')))
  // If aging_Status is missing, derive it from the days and the AR status
  const agingStatus = readField(dto, 'agingStatus') ?? (daysOverdue > 0 ? 'overdue' : readField(dto, 'status'))

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
    agingStatus: normalizeAgingStatus(agingStatus),
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
