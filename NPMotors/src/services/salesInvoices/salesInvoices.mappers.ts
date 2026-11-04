import type {
  SalesInvoice,
  SalesInvoiceFormValues,
  SalesInvoiceLifecycle,
  SalesInvoicePaymentStatus,
} from '../../types/salesInvoices'

// Accepted spellings per field: ASP.NET camelCase (invoice_Date), plain camelCase, PascalCase and snake_case
const DTO_FIELDS = {
  id: ['id', 'Id', 'salesInvoiceId', 'SalesInvoiceId', 'sales_invoice_id'],
  number: ['number', 'Number', 'invoiceNumber', 'InvoiceNumber', 'invoice_number'],
  invoiceDate: ['invoice_Date', 'invoiceDate', 'InvoiceDate', 'Invoice_Date', 'invoice_date'],
  dueDate: ['due_Date', 'dueDate', 'DueDate', 'Due_Date', 'due_date'],
  customerId: ['customer_Id', 'customerId', 'CustomerId', 'Customer_Id', 'customer_id'],
  customerName: ['customer_Name', 'customerName', 'CustomerName', 'Customer_Name', 'customer_name'],
  salespersonId: ['salesperson_Id', 'salespersonId', 'SalespersonId', 'Salesperson_Id', 'salesperson_id'],
  vehicleId: ['vehicle_Id', 'vehicleId', 'VehicleId', 'Vehicle_Id', 'vehicle_id'],
  vin: ['vin', 'Vin', 'VIN'],
  make: ['make', 'Make'],
  model: ['model', 'Model'],
  vehicleStatus: ['vehicle_Status', 'vehicleStatus', 'VehicleStatus', 'Vehicle_Status', 'vehicle_status'],
  sellingPrice: ['selling_Price', 'sellingPrice', 'SellingPrice', 'Selling_Price', 'selling_price'],
  vehicleTotalCost: ['vehicle_Total_Cost', 'vehicleTotalCost', 'VehicleTotalCost', 'Vehicle_Total_Cost', 'vehicle_total_cost'],
  salePrice: ['sale_Price', 'salePrice', 'SalePrice', 'Sale_Price', 'sale_price'],
  tax: ['tax', 'Tax'],
  fees: ['fees', 'Fees'],
  discount: ['discount', 'Discount'],
  total: ['total', 'Total'],
  paid: ['paid', 'Paid'],
  balance: ['balance', 'Balance'],
  lifecycle: ['lifecycle', 'Lifecycle'],
  paymentStatus: ['payment_Status', 'paymentStatus', 'PaymentStatus', 'Payment_Status', 'payment_status'],
  cancelReason: ['cancel_Reason', 'cancelReason', 'CancelReason', 'Cancel_Reason', 'cancel_reason'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type SalesInvoiceDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type SalesInvoiceDto = Partial<Record<SalesInvoiceDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'salesInvoices', 'invoices', '$values'] as const

const LIFECYCLES: readonly SalesInvoiceLifecycle[] = ['draft', 'posted', 'cancelled']
const PAYMENT_STATUSES: readonly SalesInvoicePaymentStatus[] = ['paid', 'partial', 'unpaid']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: SalesInvoiceDto, field: DtoField): unknown {
  const keys: readonly SalesInvoiceDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: SalesInvoiceDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: SalesInvoiceDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

// The API sends "2026-11-01T00:00:00"; the design shows the date part only
function readDate(dto: SalesInvoiceDto, field: DtoField): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(readString(dto, field))
  return match ? match[0] : ''
}

// An unknown lifecycle is shown as a draft: the least final state, so it never offers Cancel by mistake
export function normalizeLifecycle(value: unknown): SalesInvoiceLifecycle {
  const lifecycle = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return LIFECYCLES.find((known) => known === lifecycle) ?? 'draft'
}

// Drafts come back with payment_Status: null; keep that rather than inventing "unpaid"
export function normalizePaymentStatus(value: unknown): SalesInvoicePaymentStatus | null {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return PAYMENT_STATUSES.find((known) => known === status) ?? null
}

// GetSalesInvoiceById returns the same bare object as a list row, so both use this
export function mapSalesInvoice(raw: unknown): SalesInvoice {
  const dto: SalesInvoiceDto = isRecord(raw) ? raw : {}
  const make = readString(dto, 'make')
  const model = readString(dto, 'model')

  return {
    id: readString(dto, 'id'),
    number: readString(dto, 'number'),
    invoiceDate: readDate(dto, 'invoiceDate'),
    dueDate: readDate(dto, 'dueDate'),
    customerId: readString(dto, 'customerId'),
    customerName: readString(dto, 'customerName'),
    salespersonId: readString(dto, 'salespersonId'),
    vehicleId: readString(dto, 'vehicleId'),
    vin: readString(dto, 'vin'),
    make,
    model,
    vehicle: [make, model].join(' ').trim(),
    vehicleStatus: readString(dto, 'vehicleStatus'),
    sellingPrice: readNumber(dto, 'sellingPrice'),
    vehicleTotalCost: readNumber(dto, 'vehicleTotalCost'),
    salePrice: readNumber(dto, 'salePrice'),
    tax: readNumber(dto, 'tax'),
    fees: readNumber(dto, 'fees'),
    discount: readNumber(dto, 'discount'),
    total: readNumber(dto, 'total'),
    paid: readNumber(dto, 'paid'),
    balance: readNumber(dto, 'balance'),
    lifecycle: normalizeLifecycle(readField(dto, 'lifecycle')),
    paymentStatus: normalizePaymentStatus(readField(dto, 'paymentStatus')),
    cancelReason: readString(dto, 'cancelReason'),
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

export function mapSalesInvoiceCollection(body: unknown): SalesInvoice[] {
  return unwrapCollection(body).filter(isRecord).map(mapSalesInvoice)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// Body of POST SalesInvoice/AddSalesInvoice and PostSalesInvoice (SalesInvoiceCreateDto). The API sets the sale
// price from the vehicle, so it isn't sent. Ids are int64 and amounts are decimals in the range 0–999999999999.99.
export interface SalesInvoiceCreateDto {
  customer_Id: number
  salesperson_Id: number
  vehicle_Id: number
  invoice_Date: string
  due_Date: string | null
  tax: number
  fees: number
  discount: number
}

const toAmount = (value: string) => {
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

export function toSalesInvoiceRequestDto(values: SalesInvoiceFormValues): SalesInvoiceCreateDto {
  return {
    customer_Id: Number(values.customerId),
    salesperson_Id: Number(values.salespersonId),
    vehicle_Id: Number(values.vehicleId),
    invoice_Date: values.invoiceDate,
    due_Date: values.dueDate || null,
    tax: toAmount(values.tax),
    fees: toAmount(values.fees),
    discount: toAmount(values.discount),
  }
}

// Body of POST SalesInvoice/CancelSalesInvoice (SalesInvoiceCancelDto); the id goes in the query string
export interface SalesInvoiceCancelDto {
  reason: string
}

export const toSalesInvoiceCancelDto = (reason: string): SalesInvoiceCancelDto => ({ reason: reason.trim() })
