import { RECEIPT_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { bankAccountsApi } from '../bankAccounts/bankAccounts.api'
import { receivablesApi } from '../receivables/receivables.api'
import type { Receivable } from '../../types/receivables'
import type { ArPaymentRequest, MiscReceiptRequest, ReceiptBankAccountOption, ReceiptPayment } from '../../types/receipts'
import { mapPaymentHistory, toReceiptBankAccountOptions, toRecordArPaymentDto, toRecordMiscReceiptDto } from './receipts.mappers'

// The API's largest page; accounts past the first 100 can't be picked
const ACCOUNT_OPTIONS_PAGE_SIZE = 100

async function getBankAccountOptions(signal?: AbortSignal): Promise<ReceiptBankAccountOption[]> {
  const page = await bankAccountsApi.getBankAccounts({ pageNumber: 1, pageSize: ACCOUNT_OPTIONS_PAGE_SIZE, bankId: 'all', searchTerm: '' }, signal)
  return toReceiptBankAccountOptions(page.items)
}

// The AR list and invoice are refetched afterwards, so the response body isn't needed
async function recordArPayment({ arInvoiceId, values }: ArPaymentRequest, signal?: AbortSignal): Promise<void> {
  await customerClient.post(RECEIPT_ENDPOINTS.recordArPayment(arInvoiceId), toRecordArPaymentDto(values), { signal })
}

// The response body isn't shown, so it isn't read
async function recordMiscReceipt(request: MiscReceiptRequest, signal?: AbortSignal): Promise<void> {
  await customerClient.post(RECEIPT_ENDPOINTS.recordMiscReceipt, toRecordMiscReceiptDto(request), { signal })
}

// The API's largest page; a customer's open invoices past the first 100 can't be picked
const CUSTOMER_INVOICES_PAGE_SIZE = 100

// A customer's open AR invoices (GetAllAr leaves settled ones out by default), for the Against Invoice list
async function getCustomerInvoices(customerId: string, signal?: AbortSignal): Promise<Receivable[]> {
  const page = await receivablesApi.getReceivables({ pageNumber: 1, pageSize: CUSTOMER_INVOICES_PAGE_SIZE, status: 'all', customerId, asOfDate: '' }, signal)
  return page.items.filter((invoice) => invoice.id && invoice.balance > 0)
}

// Every receipt posted against one AR invoice, in one response (the endpoint isn't paged)
async function getPaymentHistory(arInvoiceId: string, signal?: AbortSignal): Promise<ReceiptPayment[]> {
  const { data } = await customerClient.get<unknown>(RECEIPT_ENDPOINTS.getPaymentHistory(arInvoiceId), { signal })
  return mapPaymentHistory(data)
}

export const receiptsApi = { getBankAccountOptions, recordArPayment, recordMiscReceipt, getCustomerInvoices, getPaymentHistory }
