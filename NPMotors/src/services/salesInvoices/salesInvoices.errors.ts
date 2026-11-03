import axios from 'axios'
import type { SalesInvoiceFieldErrors, SalesInvoiceFormField, SalesInvoiceSaveError } from '../../types/salesInvoices'

const UNREACHABLE_MESSAGE = 'Sales invoice service is unreachable. Is the API running on https://localhost:7003?'
const FALLBACK_MESSAGE = 'Sales invoices could not be loaded. Please try again.'
const DETAIL_FALLBACK_MESSAGE = 'This sales invoice could not be loaded. Please try again.'
const NOT_FOUND_MESSAGE = 'This sales invoice no longer exists.'
const SAVE_FALLBACK_MESSAGE = 'The sales invoice could not be saved. Please try again.'
const CANCEL_FALLBACK_MESSAGE = 'The sales invoice could not be cancelled. Please try again.'
export const OPTIONS_FALLBACK_MESSAGE = 'Customers, salespeople and vehicles could not be loaded. Please try again.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// ASP.NET ProblemDetails: { title, detail, errors: { field: string[] } }. The sales invoice business rules
// ("Customer is required.", "Customer does not exist.") answer 400 with { message } instead.
function readProblemDetails(body: unknown): string {
  if (isNonEmptyString(body)) return body.trim().startsWith('<') ? '' : body.trim()
  if (!isRecord(body)) return ''

  const { errors, detail, title, message } = body
  if (isRecord(errors)) {
    const messages = Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(isNonEmptyString)
    if (messages.length) return messages.join(' ')
  }
  if (isNonEmptyString(message)) return message
  if (isNonEmptyString(detail)) return detail
  if (isNonEmptyString(title)) return title
  return ''
}

export function getSalesInvoiceErrorMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (axios.isCancel(error)) return ''
  if (!axios.isAxiosError(error)) return fallback
  if (error.code === 'ERR_CANCELED') return ''
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return UNREACHABLE_MESSAGE

  const { status, data } = error.response ?? {}
  // The Vite proxy answers 500 with an empty body (or a 502–504) when the API is down
  if (status !== undefined && ((status >= 502 && status <= 504) || (status === 500 && !data))) return UNREACHABLE_MESSAGE

  return readProblemDetails(data) || fallback
}

// GetSalesInvoiceById answers 404 with a bare "Not Found" ProblemDetails; show something friendlier
export function getSalesInvoiceDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getSalesInvoiceErrorMessage(error, DETAIL_FALLBACK_MESSAGE)
}

// CancelSalesInvoice also answers 404 for an unknown id
export function getSalesInvoiceCancelErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getSalesInvoiceErrorMessage(error, CANCEL_FALLBACK_MESSAGE)
}

const FORM_FIELDS: readonly SalesInvoiceFormField[] = [
  'customerId',
  'salespersonId',
  'vehicleId',
  'invoiceDate',
  'dueDate',
  'tax',
  'fees',
  'discount',
]

// ProblemDetails keys look like "Customer_Id", "Tax" or "$.invoice_Date"; match them to form fields ignoring case
// and underscores
const normalizeKey = (key: string) => key.replace(/^\$\./, '').replace(/_/g, '').toLowerCase()

export function getSalesInvoiceFieldErrors(error: unknown): SalesInvoiceFieldErrors {
  const fieldErrors: SalesInvoiceFieldErrors = {}
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return fieldErrors
  const body: unknown = error.response.data
  if (!isRecord(body) || !isRecord(body.errors)) return fieldErrors
  for (const [key, value] of Object.entries(body.errors)) {
    const field = FORM_FIELDS.find((name) => name.toLowerCase() === normalizeKey(key))
    const message = (Array.isArray(value) ? value : [value]).find(isNonEmptyString)
    if (field && message) fieldErrors[field] = message
  }
  return fieldErrors
}

// Validation errors go next to their fields; only errors no field can show become the banner message
export function getSalesInvoiceSaveError(error: unknown): SalesInvoiceSaveError {
  const fieldErrors = getSalesInvoiceFieldErrors(error)
  const message = Object.keys(fieldErrors).length ? '' : getSalesInvoiceErrorMessage(error, SAVE_FALLBACK_MESSAGE)
  return { message, fieldErrors }
}
