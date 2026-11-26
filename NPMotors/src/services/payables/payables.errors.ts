import axios from 'axios'

const UNREACHABLE_MESSAGE = 'Accounts payable service is unreachable. Is the API running on https://localhost:7003?'
const FALLBACK_MESSAGE = 'Payables could not be loaded. Please try again.'
const DETAIL_FALLBACK_MESSAGE = 'This bill could not be loaded. Please try again.'
const NOT_FOUND_MESSAGE = 'This bill no longer exists.'
const PAYMENT_HISTORY_FALLBACK_MESSAGE = 'Payment history could not be loaded. Please try again.'
export const VENDOR_OPTIONS_FALLBACK_MESSAGE = 'Vendors could not be loaded. Please try again.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// ASP.NET ProblemDetails: { title, detail, errors: { field: string[] } }. GetAllApBills also answers a bad Status
// with a bare list, { errors: ["Status must be unpaid, partial or overdue."] }.
function readProblemDetails(body: unknown): string {
  if (isNonEmptyString(body)) return body.trim().startsWith('<') ? '' : body.trim()
  if (!isRecord(body)) return ''

  const { errors, detail, title } = body
  if (isRecord(errors) || Array.isArray(errors)) {
    const messages = Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(isNonEmptyString)
    if (messages.length) return messages.join(' ')
  }
  if (isNonEmptyString(detail)) return detail
  if (isNonEmptyString(title)) return title
  return ''
}

export function getPayableErrorMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (axios.isCancel(error)) return ''
  if (!axios.isAxiosError(error)) return fallback
  if (error.code === 'ERR_CANCELED') return ''
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return UNREACHABLE_MESSAGE

  const { status, data } = error.response ?? {}
  // The Vite proxy answers 500 with an empty body (or a 502–504) when the API is down
  if (status !== undefined && ((status >= 502 && status <= 504) || (status === 500 && !data))) return UNREACHABLE_MESSAGE

  return readProblemDetails(data) || fallback
}

// GetApById answers 404 with a bare "Not Found" ProblemDetails; show something friendlier
export function getPayableDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getPayableErrorMessage(error, DETAIL_FALLBACK_MESSAGE)
}

// GetPaymentHistory also answers 404 for an unknown bill
export function getPaymentHistoryErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getPayableErrorMessage(error, PAYMENT_HISTORY_FALLBACK_MESSAGE)
}
