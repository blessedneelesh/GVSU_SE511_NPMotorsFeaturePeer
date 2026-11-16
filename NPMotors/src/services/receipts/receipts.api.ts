import { RECEIPT_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { bankAccountsApi } from '../bankAccounts/bankAccounts.api'
import type { ArPaymentRequest, ReceiptBankAccountOption } from '../../types/receipts'
import { toReceiptBankAccountOptions, toRecordArPaymentDto } from './receipts.mappers'

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

export const receiptsApi = { getBankAccountOptions, recordArPayment }
