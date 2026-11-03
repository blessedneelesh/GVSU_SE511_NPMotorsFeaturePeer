import axios from 'axios'

const UNREACHABLE_MESSAGE = 'Parts service is unreachable. Is the API running on https://localhost:7003?'
const FALLBACK_MESSAGE = 'Parts could not be loaded. Please try again.'
const DETAIL_FALLBACK_MESSAGE = 'This part could not be loaded. Please try again.'
const NOT_FOUND_MESSAGE = 'This part no longer exists.'
const RECEIVE_FALLBACK_MESSAGE = 'The parts receipt could not be posted. Please try again.'
export const VENDOR_OPTIONS_FALLBACK_MESSAGE = 'Vendors could not be loaded. Please try again.'
export const RECEIVE_OPTIONS_FALLBACK_MESSAGE = 'Parts and bank accounts could not be loaded. Please try again.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// ASP.NET ProblemDetails: { title, detail, errors: { field: string[] } }, or a plain { message }
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

export function getPartErrorMessage(error: unknown, fallback: string = FALLBACK_MESSAGE): string {
  if (axios.isCancel(error)) return ''
  if (!axios.isAxiosError(error)) return fallback
  if (error.code === 'ERR_CANCELED') return ''
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return UNREACHABLE_MESSAGE

  const { status, data } = error.response ?? {}
  // The Vite proxy answers 500 with an empty body (or a 502–504) when the API is down
  if (status !== undefined && ((status >= 502 && status <= 504) || (status === 500 && !data))) return UNREACHABLE_MESSAGE

  return readProblemDetails(data) || fallback
}

// GetPartById answers 404 with a bare "Not Found" ProblemDetails; show something friendlier
export function getPartDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getPartErrorMessage(error, DETAIL_FALLBACK_MESSAGE)
}

// UpdatePart's only validated field is Quantity_Received, and the form checks it first, so its 400 message
// (from the ProblemDetails errors) goes in the banner rather than next to a field
export function getPartReceiveErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) return NOT_FOUND_MESSAGE
  return getPartErrorMessage(error, RECEIVE_FALLBACK_MESSAGE)
}
