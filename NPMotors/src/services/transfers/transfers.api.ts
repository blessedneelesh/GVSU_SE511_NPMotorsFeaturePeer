import { TRANSFER_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { bankAccountsApi } from '../bankAccounts/bankAccounts.api'
import type { TransferAccountOption, TransferFormValues } from '../../types/transfers'
import { toCreateTransferDto, toTransferAccountOptions } from './transfers.mappers'

// The API's largest page; accounts past the first 100 can't be picked
const ACCOUNT_OPTIONS_PAGE_SIZE = 100

async function getAccountOptions(signal?: AbortSignal): Promise<TransferAccountOption[]> {
  const page = await bankAccountsApi.getBankAccounts({ pageNumber: 1, pageSize: ACCOUNT_OPTIONS_PAGE_SIZE, bankId: 'all', searchTerm: '' }, signal)
  return toTransferAccountOptions(page.items)
}

// The balances are refetched afterwards, so the response body isn't needed
async function createTransfer(values: TransferFormValues, signal?: AbortSignal): Promise<void> {
  await customerClient.post(TRANSFER_ENDPOINTS.createTransfer, toCreateTransferDto(values), { signal })
}

export const transfersApi = { getAccountOptions, createTransfer }
