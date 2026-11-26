import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  getPayableDetailErrorMessage,
  getMiscellaneousPaymentSaveError,
  getPayableErrorMessage,
  getVendorPaymentSaveError,
  VENDOR_OPTIONS_FALLBACK_MESSAGE,
} from '../../../services/payables/payables.errors'

const httpError = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })

describe('getPayableErrorMessage', () => {
  it('reads the bare errors list GetAllApBills sends for a bad Status', () => {
    expect(getPayableErrorMessage(httpError(400, { errors: ['Status must be unpaid, partial or overdue.'] })))
      .toBe('Status must be unpaid, partial or overdue.')
  })

  it('reads ProblemDetails field errors', () => {
    expect(getPayableErrorMessage(httpError(400, { title: 'One or more validation errors occurred.', errors: { VendorId: ["The value 'abc' is not valid for VendorId."] } })))
      .toBe("The value 'abc' is not valid for VendorId.")
  })

  it('returns an empty string for a cancelled request', () => {
    expect(getPayableErrorMessage(new CanceledError())).toBe('')
  })

  it('says the API is unreachable when the proxy answers 500 with no body or a 502', () => {
    expect(getPayableErrorMessage(httpError(500))).toMatch(/unreachable/)
    expect(getPayableErrorMessage(httpError(502, 'Bad Gateway'))).toMatch(/unreachable/)
    expect(getPayableErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatch(/localhost:7003/)
  })

  it('falls back to the given message, ignoring HTML bodies', () => {
    expect(getPayableErrorMessage(httpError(400, '<html></html>'))).toBe('Payables could not be loaded. Please try again.')
    expect(getPayableErrorMessage(new Error('boom'), VENDOR_OPTIONS_FALLBACK_MESSAGE)).toBe('Vendors could not be loaded. Please try again.')
  })
})

describe('getPayableDetailErrorMessage', () => {
  it('says the bill no longer exists on a 404', () => {
    expect(getPayableDetailErrorMessage(httpError(404, { title: 'Not Found' }))).toBe('This bill no longer exists.')
  })

  it('reads other errors, falling back to the detail message', () => {
    expect(getPayableDetailErrorMessage(httpError(400, { errors: { id: ["The value 'abc' is not valid."] } }))).toBe("The value 'abc' is not valid.")
    expect(getPayableDetailErrorMessage(httpError(400))).toBe('This bill could not be loaded. Please try again.')
    expect(getPayableDetailErrorMessage(new CanceledError())).toBe('')
  })
})

describe('getVendorPaymentSaveError', () => {
  it('maps ProblemDetails keys onto the form fields, ignoring case, underscores and a $. prefix', () => {
    expect(getVendorPaymentSaveError(httpError(400, {
      errors: { Payment_Date: ['Date is invalid.'], '$.bank_Account_Id': ['Account is invalid.'], Reference: ['Too long.'] },
    }))).toEqual({ message: '', fieldErrors: { paymentDate: 'Date is invalid.', bankAccountId: 'Account is invalid.', reference: 'Too long.' } })
  })

  it('shows errors no field can hold, and { message } rejections, as the banner', () => {
    expect(getVendorPaymentSaveError(httpError(400, { message: 'Bank account is inactive.' })))
      .toEqual({ message: 'Bank account is inactive.', fieldErrors: {} })
    expect(getVendorPaymentSaveError(httpError(400, { errors: { Other: ['Something else.'] } })))
      .toEqual({ message: 'Something else.', fieldErrors: {} })
  })

  it('says the bill no longer exists on a 404, and falls back to the payment message', () => {
    expect(getVendorPaymentSaveError(httpError(404))).toEqual({ message: 'This bill no longer exists.', fieldErrors: {} })
    expect(getVendorPaymentSaveError(httpError(400))).toEqual({ message: 'The payment could not be posted. Please try again.', fieldErrors: {} })
  })
})

describe('getMiscellaneousPaymentSaveError', () => {
  it('maps payee, category and description keys onto the form', () => {
    const error = httpError(400, { errors: { Payee: ['Required'], Payment_Category: ['Required'], Description: ['Too long'] } })
    expect(getMiscellaneousPaymentSaveError(error)).toEqual({
      message: '',
      fieldErrors: { payee: 'Required', paymentCategory: 'Required', description: 'Too long' },
    })
  })

  it('reads a 404 like any other error, since there is no bill', () => {
    expect(getMiscellaneousPaymentSaveError(httpError(404, { title: 'Not Found' }))).toEqual({ message: 'Not Found', fieldErrors: {} })
  })

  it('falls back to the payment message', () => {
    expect(getMiscellaneousPaymentSaveError(new Error('boom'))).toEqual({ message: 'The payment could not be posted. Please try again.', fieldErrors: {} })
  })
})
