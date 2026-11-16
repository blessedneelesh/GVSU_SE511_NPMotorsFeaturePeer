import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { customerClient } from '../../../services/api/customerClient'
import { bankAccountsApi } from '../../../services/bankAccounts/bankAccounts.api'
import { receiptsApi } from '../../../services/receipts/receipts.api'
import { getReceiptErrorMessage, getReceiptSaveError } from '../../../services/receipts/receipts.errors'
import { toReceiptBankAccountOptions, toRecordArPaymentDto } from '../../../services/receipts/receipts.mappers'
import { receiptFormValues } from '../../../test/fixtures/receipts'
import type { BankAccount } from '../../../types/bankAccounts'

const account = (id: string, name: string, status: BankAccount['status']): BankAccount => ({
  id, name, status, bankId: '1', bankName: 'Chase', accountNumber: `****${id}`, type: 'Checking', routing: '', bookBalance: 0,
})

const httpError = (status: number, data?: unknown, code = 'ERR_BAD_REQUEST') =>
  new AxiosError('Request failed', code, undefined, undefined,
    { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } })

describe('receipts mappers', () => {
  it('offers only active accounts with an id', () => {
    expect(toReceiptBankAccountOptions([account('1', 'Operating', 'Active'), account('2', 'Old', 'Inactive'), account('', 'Ghost', 'Active')]))
      .toEqual([{ id: '1', name: 'Operating', bankName: 'Chase', accountNumber: '****1' }])
  })

  it('builds the RecordArPaymentRequest body with numbers and a trimmed reference', () => {
    expect(toRecordArPaymentDto(receiptFormValues)).toEqual({
      receiptDate: '2026-11-15',
      amount: 5000.5,
      paymentMethod: 'check',
      reference: 'CHK-1042',
      bankAccountId: 1,
    })
  })

  it('sends a blank reference as null', () => {
    expect(toRecordArPaymentDto({ ...receiptFormValues, reference: '  ' }).reference).toBeNull()
  })
})

describe('receipts api', () => {
  it('posts to the AR invoice in the path', async () => {
    const post = vi.spyOn(customerClient, 'post').mockResolvedValue({ data: {} })
    await receiptsApi.recordArPayment({ arInvoiceId: '2471', values: receiptFormValues })
    expect(post).toHaveBeenCalledWith('Receipt/RecordArPayment/2471', toRecordArPaymentDto(receiptFormValues), { signal: undefined })
  })

  it('loads the first 100 bank accounts and keeps the active ones', async () => {
    const getBankAccounts = vi.spyOn(bankAccountsApi, 'getBankAccounts')
      .mockResolvedValue({ items: [account('1', 'Operating', 'Active'), account('2', 'Old', 'Inactive')], hasNext: false })
    const options = await receiptsApi.getBankAccountOptions()
    expect(getBankAccounts).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 100, bankId: 'all', searchTerm: '' }, undefined)
    expect(options.map((option) => option.id)).toEqual(['1'])
  })
})

describe('receipts errors', () => {
  it('returns nothing for a cancelled request', () => {
    expect(getReceiptErrorMessage(new CanceledError())).toBe('')
  })

  it('reports the API as unreachable when the proxy gets no answer', () => {
    expect(getReceiptErrorMessage(httpError(500))).toMatch(/unreachable/)
    expect(getReceiptErrorMessage(httpError(502, 'Bad Gateway'))).toMatch(/unreachable/)
  })

  it('says the invoice no longer exists on a 404', () => {
    expect(getReceiptErrorMessage(httpError(404, { title: 'Not Found' }))).toBe('This receivable no longer exists.')
  })

  it('maps ProblemDetails keys onto the form fields, ignoring case and the $. prefix', () => {
    const error = httpError(400, { errors: { '$.amount': ['Bad amount'], BankAccountId: ['Bad account'], request: ['The request field is required.'] } })
    expect(getReceiptSaveError(error)).toEqual({ message: '', fieldErrors: { amount: 'Bad amount', bankAccountId: 'Bad account' } })
  })

  it('uses the ProblemDetails text as the banner when no field matches', () => {
    expect(getReceiptSaveError(httpError(400, { title: 'Invoice is already paid.' }))).toEqual({ message: 'Invoice is already paid.', fieldErrors: {} })
  })

  it('falls back to the payment message', () => {
    expect(getReceiptSaveError(new Error('boom'))).toEqual({ message: 'The payment could not be posted. Please try again.', fieldErrors: {} })
  })
})
