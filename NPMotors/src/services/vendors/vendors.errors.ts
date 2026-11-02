import axios from 'axios'
import type { VendorFieldErrors, VendorFormField, VendorSaveError } from '../../types/vendors'

const UNREACHABLE_MESSAGE = 'Vendor service is unreachable. Is the API running on https://localhost:7003?'
const FALLBACK_MESSAGE = 'Vendors could not be loaded. Please try again.'
const DETAIL_FALLBACK_MESSAGE = 'This vendor could not be loaded. Please try again.'
const NOT_FOUND_MESSAGE = 'This vendor no longer exists.'
const SAVE_FALLBACK_MESSAGE = 'The vendor could not be saved. Please try again.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// ASP.NET ProblemDetails: { title, detail, errors: { field: string[] } }
function readProblemDetails(body: unknown): string {
  if (isNonEmptyString(body)) return body.trim().startsWith('<') ? '' : body.trim()
  if (!isRecord(body)) return ''

  const { errors, detail, title } = body
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

export function getVendorErrorMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (axios.isCancel(error)) return ''
  if (!axios.isAxiosError(error)) return fallback
  if (error.code === 'ERR_CANCELED') return ''
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return UNREACHABLE_MESSAGE

  const { status, data } = error.response ?? {}
  // The Vite proxy answers 500 with an empty body (or a 502–504) when the API is down
  if (status !== undefined && ((status >= 502 && status <= 504) || (status === 500 && !data))) return UNREACHABLE_MESSAGE

  return readProblemDetails(data) || fallback
}

// GetVendorById answers 404 with a bare "Not Found" ProblemDetails; show something friendlier
export function getVendorDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getVendorErrorMessage(error, DETAIL_FALLBACK_MESSAGE)
}

const FORM_FIELDS: readonly VendorFormField[] = ['name', 'contact', 'phone', 'email', 'address', 'type', 'status']

// ProblemDetails keys look like "Name" or "$.type"; match them to form fields ignoring case and underscores
const normalizeKey = (key: string) => key.replace(/^\$\./, '').replace(/_/g, '').toLowerCase()

function readFieldErrors(body: unknown): VendorFieldErrors {
  const fieldErrors: VendorFieldErrors = {}
  if (!isRecord(body) || !isRecord(body.errors)) return fieldErrors
  for (const [key, value] of Object.entries(body.errors)) {
    const field = FORM_FIELDS.find((name) => name.toLowerCase() === normalizeKey(key))
    const message = (Array.isArray(value) ? value : [value]).find(isNonEmptyString)
    if (field && message) fieldErrors[field] = message
  }
  return fieldErrors
}

// Validation errors go next to their fields; only errors no field can show become the banner message
export function getVendorSaveError(error: unknown): VendorSaveError {
  const fieldErrors = axios.isAxiosError(error) && error.response?.status === 400 ? readFieldErrors(error.response.data) : {}
  const message = Object.keys(fieldErrors).length ? '' : getVendorErrorMessage(error, SAVE_FALLBACK_MESSAGE)
  return { message, fieldErrors }
}
