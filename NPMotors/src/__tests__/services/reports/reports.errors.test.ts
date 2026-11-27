import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { describe, expect, it } from 'vitest'
import { getReportErrorMessage } from '../../../services/reports/reports.errors'

const UNREACHABLE = 'Report service is unreachable. Is the API running on https://localhost:7003?'
const FALLBACK = 'The profit and loss report could not be loaded. Please try again.'

const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })

describe('getReportErrorMessage', () => {
  it('returns an empty string for a cancelled request', () => {
    expect(getReportErrorMessage(new CanceledError())).toBe('')
    expect(getReportErrorMessage(new AxiosError('canceled', 'ERR_CANCELED'))).toBe('')
  })

  it('falls back for a non-axios error, or uses the given fallback', () => {
    expect(getReportErrorMessage(new Error('boom'))).toBe(FALLBACK)
    expect(getReportErrorMessage('boom', 'Custom')).toBe('Custom')
  })

  it.each([
    ['a network error', new AxiosError('Network Error', 'ERR_NETWORK')],
    ['a timeout', new AxiosError('timeout', 'ECONNABORTED')],
    ['a 502 from the proxy', httpError(502)],
    ['a 504 from the proxy', httpError(504)],
    ['an empty 500 from the proxy', httpError(500)],
  ])('reports the API as unreachable for %s', (_, error) => {
    expect(getReportErrorMessage(error)).toBe(UNREACHABLE)
  })

  it('joins the validation messages of a 400', () => {
    const error = httpError(400, {
      title: 'One or more validation errors occurred.',
      errors: { Anchor_Date: ['The Anchor_Date field is required.'], Period_Type: ['Period_Type must be Month, Quarter or YearToDate.'] },
    })
    expect(getReportErrorMessage(error)).toBe('The Anchor_Date field is required. Period_Type must be Month, Quarter or YearToDate.')
  })

  it('prefers detail over title, and uses a plain-text body', () => {
    expect(getReportErrorMessage(httpError(500, { title: 'Server error', detail: 'Database offline' }))).toBe('Database offline')
    expect(getReportErrorMessage(httpError(500, { title: 'Server error' }))).toBe('Server error')
    expect(getReportErrorMessage(httpError(500, 'Something broke'))).toBe('Something broke')
  })

  it('ignores an HTML body and falls back', () => {
    expect(getReportErrorMessage(httpError(500, '<html>error</html>'))).toBe(FALLBACK)
    expect(getReportErrorMessage(httpError(404, {}))).toBe(FALLBACK)
  })
})
