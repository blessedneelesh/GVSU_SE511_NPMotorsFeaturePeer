import { BANK_ACCOUNT_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import type { BankAccount, BankAccountFormValues, BankAccountPage, BankAccountQuery, BankOption } from '../../types/bankAccounts'
import { mapBankAccount, mapBankAccountCollection, readHasNext, toBankAccountCreateDto, toBankOptions } from './bankAccounts.mappers'

interface BankAccountQueryParams {
  PageNumber: number
  PageSize: number
  BankId?: string
  SearchTerm?: string
}

// The API's largest page; banks whose accounts are all past the first 100 won't be offered
const BANK_OPTIONS_PAGE_SIZE = 100

async function getBankAccounts(query: BankAccountQuery, signal?: AbortSignal): Promise<BankAccountPage> {
  const params: BankAccountQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.bankId !== 'all') params.BankId = query.bankId
  const searchTerm = query.searchTerm.trim()
  if (searchTerm) params.SearchTerm = searchTerm

  const { data } = await customerClient.get<unknown>(BANK_ACCOUNT_ENDPOINTS.getAllBankAccounts, { params, signal })
  const items = mapBankAccountCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getBankAccountById(id: string, signal?: AbortSignal): Promise<BankAccount> {
  const { data } = await customerClient.get<unknown>(BANK_ACCOUNT_ENDPOINTS.getBankAccountById, { params: { id }, signal })
  return mapBankAccount(data)
}

// The list is refetched afterwards, so the response body isn't needed
async function addBankAccount(values: BankAccountFormValues, signal?: AbortSignal): Promise<void> {
  await customerClient.post(BANK_ACCOUNT_ENDPOINTS.addBankAccount, toBankAccountCreateDto(values), { signal })
}

// No Bank endpoint exists yet, so the bank filter and form list the banks found on the accounts
async function getBankOptions(signal?: AbortSignal): Promise<BankOption[]> {
  const page = await getBankAccounts({ pageNumber: 1, pageSize: BANK_OPTIONS_PAGE_SIZE, bankId: 'all', searchTerm: '' }, signal)
  return toBankOptions(page.items)
}

export const bankAccountsApi = { getBankAccounts, getBankAccountById, addBankAccount, getBankOptions }
