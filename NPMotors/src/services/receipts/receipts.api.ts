import { RECEIPT_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { bankAccountsApi } from '../bankAccounts/bankAccounts.api'
import { receivablesApi } from '../receivables/receivables.api'
import type { ArPaymentRequest, ReceiptBankAccountOption, ReceiptPayment, SalesInvoicePaymentsRequest } from '../../types/receipts'
import { mapPaymentHistory, toReceiptBankAccountOptions, toRecordArPaymentDto } from './receipts.mappers'

// The API's largest page; accounts past the first 100 can't be picked
const ACCOUNT_OPTIONS_PAGE_SIZE = 100

// The receivable lookup reads the customer's AR invoices a page at a time, and gives up after 1,000 of them
const AR_LOOKUP_PAGE_SIZE = 100
const AR_LOOKUP_MAX_PAGES = 10

async function getBankAccountOptions(signal?: AbortSignal): Promise<ReceiptBankAccountOption[]> {
  const page = await bankAccountsApi.getBankAccounts({ pageNumber: 1, pageSize: ACCOUNT_OPTIONS_PAGE_SIZE, bankId: 'all', searchTerm: '' }, signal)
  return toReceiptBankAccountOptions(page.items)
}

// The AR list and invoice are refetched afterwards, so the response body isn't needed
async function recordArPayment({ arInvoiceId, values }: ArPaymentRequest, signal?: AbortSignal): Promise<void> {
  await customerClient.post(RECEIPT_ENDPOINTS.recordArPayment(arInvoiceId), toRecordArPaymentDto(values), { signal })
}

// Every receipt posted against one AR invoice, in one response (the endpoint isn't paged)
async function getPaymentHistory(arInvoiceId: string, signal?: AbortSignal): Promise<ReceiptPayment[]> {
  const { data } = await customerClient.get<unknown>(RECEIPT_ENDPOINTS.getPaymentHistory(arInvoiceId), { signal })
  return mapPaymentHistory(data)
}

// The AR invoice raised for a sales invoice, or null when there is none (drafts, or a receivable that was removed).
// GetAllAr can't search by invoice number, so the customer's receivables are paged through for the matching one.
async function findArInvoiceId({ customerId, invoiceNumber }: SalesInvoicePaymentsRequest, signal?: AbortSignal): Promise<string | null> {
  const wanted = invoiceNumber.trim().toLowerCase()
  if (!wanted) return null
  for (let pageNumber = 1; pageNumber <= AR_LOOKUP_MAX_PAGES; pageNumber += 1) {
    const page = await receivablesApi.getReceivables(
      { pageNumber, pageSize: AR_LOOKUP_PAGE_SIZE, status: 'all', customerId: customerId || 'all', asOfDate: '' },
      signal,
    )
    const match = page.items.find((item) => item.id && item.invoiceNumber.trim().toLowerCase() === wanted)
    if (match) return match.id
    if (!page.hasNext) return null
  }
  return null
}

// A sales invoice's receipts: no receivable means no receipts to list
async function getSalesInvoicePayments(request: SalesInvoicePaymentsRequest, signal?: AbortSignal): Promise<ReceiptPayment[]> {
  const arInvoiceId = await findArInvoiceId(request, signal)
  return arInvoiceId ? getPaymentHistory(arInvoiceId, signal) : []
}

export const receiptsApi = { getBankAccountOptions, recordArPayment, getPaymentHistory, findArInvoiceId, getSalesInvoicePayments }
