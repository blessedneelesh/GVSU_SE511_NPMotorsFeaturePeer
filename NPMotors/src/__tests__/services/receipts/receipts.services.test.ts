import { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { customerClient } from '../../../services/api/customerClient'
import { bankAccountsApi } from '../../../services/bankAccounts/bankAccounts.api'
import { receiptsApi } from '../../../services/receipts/receipts.api'
import { getReceiptErrorMessage, getReceiptSaveError } from '../../../services/receipts/receipts.errors'
import { mapPaymentHistory, toReceiptBankAccountOptions, toRecordArPaymentDto } from '../../../services/receipts/receipts.mappers'
import { receiptFormValues, receiptPayments } from '../../../test/fixtures/receipts'
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

// GetPaymentHistory/2471 as the API answered it
const paymentHistoryBody = {
  id: 2471, number: 'AR-002471', invoiceNumber: 'INV-004262', customerName: 'Jennifer Brown', dueDate: '2026-11-08T00:00:00',
  amount: 29350.0, paid: 1850.0, balance: 27500.0, status: 'partial',
  payments: [
    { id: 461, receiptNumber: 'RCT-2026-000461', receiptDate: '2026-11-08T00:00:00', payer: null, description: null, amount: 1200.0,
      paymentMethod: 'check', reference: 'INV-004262', bankAccountName: 'Operating Checking', transactionId: 2560 },
    { id: 462, receiptNumber: 'RCT-2026-000462', receiptDate: '2026-11-10T00:00:00', payer: null, description: null, amount: 650.0,
      paymentMethod: 'transfer', reference: null, bankAccountName: 'Business Savings', transactionId: 2561 },
  ],
}

describe('payment history mapper', () => {
  it('maps the payments of the GetPaymentHistory body', () => {
    expect(mapPaymentHistory(paymentHistoryBody)).toEqual(receiptPayments)
  })

  it('accepts a bare array and PascalCase fields', () => {
    expect(mapPaymentHistory([{ Id: 9, ReceiptNumber: 'RCT-9', ReceiptDate: '2026-01-02T00:00:00', Amount: '10.5', PaymentMethod: 'Cash' }]))
      .toEqual([{ id: '9', receiptNumber: 'RCT-9', receiptDate: '2026-01-02', amount: 10.5, paymentMethod: 'cash', reference: '', bankAccountName: '' }])
  })

  it('keeps an unknown method as null and skips rows that are not objects', () => {
    expect(mapPaymentHistory({ payments: [{ id: 1, paymentMethod: 'finance', amount: 'abc' }, null, 'x'] }))
      .toEqual([{ id: '1', receiptNumber: '', receiptDate: '', amount: 0, paymentMethod: null, reference: '', bankAccountName: '' }])
  })

  it('reads an invoice with no payments, or an unexpected body, as none', () => {
    expect(mapPaymentHistory({ ...paymentHistoryBody, payments: [] })).toEqual([])
    expect(mapPaymentHistory({ id: 1 })).toEqual([])
    expect(mapPaymentHistory('')).toEqual([])
  })
})

describe('receipts api', () => {
  it('gets the payment history with the AR invoice in the path', async () => {
    const get = vi.spyOn(customerClient, 'get').mockResolvedValue({ data: paymentHistoryBody })
    const signal = new AbortController().signal
    expect(await receiptsApi.getPaymentHistory('2471', signal)).toEqual(receiptPayments)
    expect(get).toHaveBeenCalledWith('Receipt/GetPaymentHistory/2471', { signal })
  })

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
