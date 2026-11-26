import axios from 'axios'
import type { VehiclePurchaseFormField, VehiclePurchaseSaveError } from '../../types/vehicles'

const UNREACHABLE_MESSAGE = 'Vehicle service is unreachable. Is the API running on https://localhost:7003?'
const FALLBACK_MESSAGE = 'Vehicles could not be loaded. Please try again.'
const DETAIL_FALLBACK_MESSAGE = 'This vehicle could not be loaded. Please try again.'
const NOT_FOUND_MESSAGE = 'This vehicle no longer exists.'
const PURCHASE_FALLBACK_MESSAGE = 'The purchase could not be posted. Please try again.'
export const VENDOR_OPTIONS_FALLBACK_MESSAGE = 'Vendors could not be loaded. Please try again.'
export const BANK_ACCOUNT_OPTIONS_FALLBACK_MESSAGE = 'Bank accounts could not be loaded. Please try again.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// ASP.NET ProblemDetails: { title, detail, errors: { field: string[] } }. GetAllVehicles also answers
// a bad Status with a plain { message }.
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

export function getVehicleErrorMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (axios.isCancel(error)) return ''
  if (!axios.isAxiosError(error)) return fallback
  if (error.code === 'ERR_CANCELED') return ''
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return UNREACHABLE_MESSAGE

  const { status, data } = error.response ?? {}
  // The Vite proxy answers 500 with an empty body (or a 502–504) when the API is down
  if (status !== undefined && ((status >= 502 && status <= 504) || (status === 500 && !data))) return UNREACHABLE_MESSAGE

  return readProblemDetails(data) || fallback
}

// GetVehicleById answers 404 with a bare "Not Found" ProblemDetails; show something friendlier
export function getVehicleDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getVehicleErrorMessage(error, DETAIL_FALLBACK_MESSAGE)
}

const PURCHASE_FORM_FIELDS: readonly VehiclePurchaseFormField[] = [
  'vendorId', 'purchaseDate', 'make', 'model', 'year', 'color', 'warehouse', 'vin', 'purchasePrice', 'salesTax', 'transportCost',
  'otherCosts', 'sellingPrice', 'paymentCondition', 'amountPaid', 'paymentMethod', 'bankAccountId', 'reference', 'dueDate',
]

// The purchase form splits Additional_Costs into three inputs; its errors show on the last of them
const PURCHASE_FIELD_ALIASES: Readonly<Record<string, VehiclePurchaseFormField>> = { additionalcosts: 'otherCosts' }

// ProblemDetails keys look like "Vin", "Purchase_Price" or "$.purchase_Price"; match them ignoring case and underscores
const normalizeKey = (key: string) => key.replace(/^\$\./, '').replace(/_/g, '').toLowerCase()

function readFieldErrors<Field extends string>(
  body: unknown,
  fields: readonly Field[],
  aliases: Readonly<Record<string, Field>> = {},
): Partial<Record<Field, string>> {
  const fieldErrors: Partial<Record<Field, string>> = {}
  if (!isRecord(body) || !isRecord(body.errors)) return fieldErrors
  for (const [key, value] of Object.entries(body.errors)) {
    const normalized = normalizeKey(key)
    const field = fields.find((name) => name.toLowerCase() === normalized) ?? aliases[normalized]
    const message = (Array.isArray(value) ? value : [value]).find(isNonEmptyString)
    if (field && message) fieldErrors[field] = message
  }
  return fieldErrors
}

// Validation errors go next to their fields; only errors no field can show become the banner message.
// PurchaseVehicle's business rules (duplicate VIN, inactive vendor, amount vs payment condition)
// come back as a 400 { message } with no field, so they become the banner message.
export function getVehiclePurchaseError(error: unknown): VehiclePurchaseSaveError {
  const fieldErrors = axios.isAxiosError(error) && error.response?.status === 400
    ? readFieldErrors(error.response.data, PURCHASE_FORM_FIELDS, PURCHASE_FIELD_ALIASES)
    : {}
  const message = Object.keys(fieldErrors).length ? '' : getVehicleErrorMessage(error, PURCHASE_FALLBACK_MESSAGE)
  return { message, fieldErrors }
}
