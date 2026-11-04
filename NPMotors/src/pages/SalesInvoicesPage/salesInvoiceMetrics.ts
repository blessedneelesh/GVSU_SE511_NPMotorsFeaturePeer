import type { SalesInvoice } from '../../types/salesInvoices'

// Whole dollars in the table, as Customers ("$33,900"); cents in the form and detail ("$33,900.00"), as the design
export { formatCurrency } from '../CustomersPage/customerMetrics'
export { formatPrice as formatAmount } from '../PartsPage/partMetrics'

// The design charges 8% sales tax on the sale price and a flat documentation fee; the API stores whatever is sent
export const TAX_RATE = 0.08
export const DOCUMENT_FEES = 450

export interface InvoiceTotals {
  subtotal: number
  tax: number
  fees: number
  total: number
}

const roundCents = (amount: number) => Math.round(amount * 100) / 100

// Same arithmetic as the API: total = sale price + tax + fees − discount
export function computeTotals(salePrice: number, discount: number): InvoiceTotals {
  const tax = roundCents(salePrice * TAX_RATE)
  return { subtotal: salePrice - discount, tax, fees: DOCUMENT_FEES, total: roundCents(salePrice + tax + DOCUMENT_FEES - discount) }
}

// CancelSalesInvoice only accepts posted invoices with no payment received
export const canCancel = (invoice: SalesInvoice) => invoice.lifecycle === 'posted' && invoice.paid === 0

const PAYMENT_LABELS = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' } as const

export interface StatusBadge {
  label: string
  className: string
}

// Drafts and cancelled invoices get one badge; posted invoices show "Posted" plus their payment status
export function statusBadges(invoice: SalesInvoice): StatusBadge[] {
  if (invoice.lifecycle === 'draft') return [{ label: 'Draft', className: 'badge-draft' }]
  if (invoice.lifecycle === 'cancelled') return [{ label: 'Cancelled', className: 'badge-cancelled' }]
  const posted: StatusBadge = { label: 'Posted', className: 'badge-approved' }
  return invoice.paymentStatus
    ? [posted, { label: PAYMENT_LABELS[invoice.paymentStatus], className: `badge-${invoice.paymentStatus}` }]
    : [posted]
}

// The banner title in the detail view: "Draft", "Cancelled" or "Posted · Unpaid"
export function statusTitle(invoice: SalesInvoice): string {
  if (invoice.lifecycle === 'draft') return 'Draft'
  if (invoice.lifecycle === 'cancelled') return 'Cancelled'
  return invoice.paymentStatus ? `Posted · ${PAYMENT_LABELS[invoice.paymentStatus]}` : 'Posted'
}

// The design shows the last 10 VIN characters under the vehicle name
export const shortVin = (vin: string) => vin.slice(-10)

// Local calendar dates as YYYY-MM-DD, the format <input type="date"> and the API both use
const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const todayIso = () => isoDate(new Date())

export function addDaysIso(days: number, from: Date = new Date()): string {
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}
