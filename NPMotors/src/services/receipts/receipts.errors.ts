import axios from 'axios'
import type { BankReceiptFormField, ReceiptFieldErrors, ReceiptSaveError } from '../../types/receipts'

const UNREACHABLE_MESSAGE = 'Receipt service is unreachable. Is the API running on https://localhost:7003?'
const SAVE_FALLBACK_MESSAGE = 'The payment could not be posted. Please try again.'
const NOT_FOUND_MESSAGE = 'This receivable no longer exists.'
export const BANK_ACCOUNT_OPTIONS_FALLBACK_MESSAGE = 'Bank accounts could not be loaded. Please try again.'
export const PAYMENT_HISTORY_FALLBACK_MESSAGE = 'Payment history could not be loaded. Please try again.'
export const MISC_RECEIPT_FALLBACK_MESSAGE = 'The receipt could not be posted. Please try again.'
export const CUSTOMER_INVOICES_FALLBACK_MESSAGE = "The customer's open invoices could not be loaded. Please try again."

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// ASP.NET ProblemDetails: { title, detail, errors: { field: string[] } }. RecordMiscReceipt's own checks answer
// a bare list instead: { errors: ["Payer is required. Amount must be greater than zero."] }
function readProblemDetails(body: unknown): string {
  if (isNonEmptyString(body)) return body.trim().startsWith('<') ? '' : body.trim()
  if (!isRecord(body)) return ''

  const { errors, detail, title } = body
  if (Array.isArray(errors)) {
    const messages = errors.filter(isNonEmptyString)
    if (messages.length) return messages.join(' ')
  }
  if (isRecord(errors)) {
    const messages = Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(isNonEmptyString)
    if (messages.length) return messages.join(' ')
  }
  if (isNonEmptyString(detail)) return detail
  if (isNonEmptyString(title)) return title
  return ''
}

export function getReceiptErrorMessage(error: unknown, fallback: string = SAVE_FALLBACK_MESSAGE): string {
  if (axios.isCancel(error)) return ''
  if (!axios.isAxiosError(error)) return fallback
  if (error.code === 'ERR_CANCELED') return ''
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return UNREACHABLE_MESSAGE

  const { status, data } = error.response ?? {}
  // The Vite proxy answers 500 with an empty body (or a 502–504) when the API is down
  if (status !== undefined && ((status >= 502 && status <= 504) || (status === 500 && !data))) return UNREACHABLE_MESSAGE
  // An unknown AR invoice id answers a bare "Not Found"
  if (status === 404) return NOT_FOUND_MESSAGE

  return readProblemDetails(data) || fallback
}

const FORM_FIELDS: readonly BankReceiptFormField[] = ['receiptDate', 'amount', 'paymentMethod', 'bankAccountId', 'reference', 'payer', 'description']

// ProblemDetails keys look like "Amount" or "$.bankAccountId"; match them to form fields ignoring case and underscores
const normalizeKey = (key: string) => key.replace(/^\$\./, '').replace(/_/g, '').toLowerCase()

function readFieldErrors(body: unknown): ReceiptFieldErrors {
  const fieldErrors: ReceiptFieldErrors = {}
  if (!isRecord(body) || !isRecord(body.errors)) return fieldErrors
  for (const [key, value] of Object.entries(body.errors)) {
    const field = FORM_FIELDS.find((name) => name.toLowerCase() === normalizeKey(key))
    const message = (Array.isArray(value) ? value : [value]).find(isNonEmptyString)
    if (field && message) fieldErrors[field] = message
  }
  return fieldErrors
}

// Validation errors go next to their fields; only errors no field can show (overpayment, already paid, ...) become the banner message
export function getReceiptSaveError(error: unknown, fallback: string = SAVE_FALLBACK_MESSAGE): ReceiptSaveError {
  const fieldErrors = axios.isAxiosError(error) && error.response?.status === 400 ? readFieldErrors(error.response.data) : {}
  const message = Object.keys(fieldErrors).length ? '' : getReceiptErrorMessage(error, fallback)
  return { message, fieldErrors }
}
