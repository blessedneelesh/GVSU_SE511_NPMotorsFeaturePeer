import axios from 'axios'

const UNREACHABLE_MESSAGE = 'Transaction service is unreachable. Is the API running on https://localhost:7003?'
const FALLBACK_MESSAGE = 'Transactions could not be loaded. Please try again.'
const DETAIL_FALLBACK_MESSAGE = 'This transaction could not be loaded. Please try again.'
const NOT_FOUND_MESSAGE = 'This transaction no longer exists.'
export const ACCOUNT_OPTIONS_FALLBACK_MESSAGE = 'Bank accounts could not be loaded. Please try again.'

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

export function getTransactionErrorMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (axios.isCancel(error)) return ''
  if (!axios.isAxiosError(error)) return fallback
  if (error.code === 'ERR_CANCELED') return ''
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return UNREACHABLE_MESSAGE

  const { status, data } = error.response ?? {}
  // The Vite proxy answers 500 with an empty body (or a 502–504) when the API is down
  if (status !== undefined && ((status >= 502 && status <= 504) || (status === 500 && !data))) return UNREACHABLE_MESSAGE

  return readProblemDetails(data) || fallback
}

// GetTransactionById answers 404 with a bare "Not Found" ProblemDetails; show something friendlier
export function getTransactionDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getTransactionErrorMessage(error, DETAIL_FALLBACK_MESSAGE)
}
