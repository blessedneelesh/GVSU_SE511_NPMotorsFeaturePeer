import type { Customer } from './customers'
import type { Employee } from './employees'
import type { Vehicle } from './vehicles'

// The API's lifecycle and payment statuses (lower case on the wire). Drafts have no payment status.
export type SalesInvoiceLifecycle = 'draft' | 'posted' | 'cancelled'
export type SalesInvoicePaymentStatus = 'paid' | 'partial' | 'unpaid'

// The design's single "Status" filter. Draft, Posted and Cancelled filter the lifecycle; Paid, Partial and Unpaid
// filter the payment status of posted invoices.
export type SalesInvoiceStatusFilter = 'all' | SalesInvoiceLifecycle | SalesInvoicePaymentStatus

export interface SalesInvoice {
  id: string
  number: string
  // YYYY-MM-DD, or '' when the API has none
  invoiceDate: string
  dueDate: string
  customerId: string
  customerName: string
  // Invoices only carry salesperson_Id; names are looked up from the employees
  salespersonId: string
  vehicleId: string
  vin: string
  make: string
  model: string
  // "Ram 1500"; built by the mapper so the list, detail and breadcrumb agree
  vehicle: string
  vehicleStatus: string
  // The vehicle's list price and cost, as GetAll/GetById return them alongside the invoice
  sellingPrice: number
  vehicleTotalCost: number
  salePrice: number
  tax: number
  fees: number
  discount: number
  total: number
  paid: number
  balance: number
  lifecycle: SalesInvoiceLifecycle
  paymentStatus: SalesInvoicePaymentStatus | null
  cancelReason: string
}

export interface SalesInvoiceQuery {
  pageNumber: number
  pageSize: number
  status: SalesInvoiceStatusFilter
  // YYYY-MM-DD, or '' for no bound; both bounds are inclusive
  fromDate: string
  toDate: string
  searchTerm: string
}

export interface SalesInvoicePage {
  items: SalesInvoice[]
  hasNext: boolean
}

// Form state: what the user picks and types, before it becomes the API's SalesInvoiceCreateDto.
// Tax and fees aren't typed: the form computes them as the design does (8% of the sale price, flat fees).
export interface SalesInvoiceFormValues {
  customerId: string
  salespersonId: string
  vehicleId: string
  invoiceDate: string
  dueDate: string
  tax: string
  fees: string
  discount: string
}

export type SalesInvoiceFormField = keyof SalesInvoiceFormValues

export type SalesInvoiceFieldErrors = Partial<Record<SalesInvoiceFormField, string>>

export interface SalesInvoiceSaveError {
  message: string
  fieldErrors: SalesInvoiceFieldErrors
}

// "Save Draft" calls AddSalesInvoice; "Post Invoice" calls PostSalesInvoice with the same body
export type SalesInvoiceSaveMode = 'draft' | 'post'

export interface SalesInvoiceCancelRequest {
  id: string
  reason: string
}

// What the form and the table look things up in: every customer and employee (for names), the active
// salespeople and the available vehicles (for the form's dropdowns)
export interface SalesInvoiceOptions {
  customers: Customer[]
  employees: Employee[]
  salespeople: Employee[]
  vehicles: Vehicle[]
}
