import { TRANSACTION_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { bankAccountsApi } from '../bankAccounts/bankAccounts.api'
import type { Transaction, TransactionAccountOption, TransactionPage, TransactionQuery } from '../../types/transactions'
import { mapTransaction, mapTransactionCollection, readHasNext, toTransactionAccountOptions } from './transactions.mappers'

interface TransactionQueryParams {
  PageNumber: number
  PageSize: number
  BankAccountId?: string
  Direction?: string
  DateFrom?: string
  DateTo?: string
}

// The API's largest page; accounts past the first 100 won't be offered in the filter
const ACCOUNT_OPTIONS_PAGE_SIZE = 100

async function getTransactions(query: TransactionQuery, signal?: AbortSignal): Promise<TransactionPage> {
  const params: TransactionQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.bankAccountId !== 'all') params.BankAccountId = query.bankAccountId
  if (query.direction !== 'all') params.Direction = query.direction
  if (query.dateFrom) params.DateFrom = query.dateFrom
  if (query.dateTo) params.DateTo = query.dateTo

  const { data } = await customerClient.get<unknown>(TRANSACTION_ENDPOINTS.getAllTransactions, { params, signal })
  const items = mapTransactionCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getTransactionById(id: string, signal?: AbortSignal): Promise<Transaction> {
  const { data } = await customerClient.get<unknown>(TRANSACTION_ENDPOINTS.getTransactionById, { params: { id }, signal })
  return mapTransaction(data)
}

async function getAccountOptions(signal?: AbortSignal): Promise<TransactionAccountOption[]> {
  const page = await bankAccountsApi.getBankAccounts({ pageNumber: 1, pageSize: ACCOUNT_OPTIONS_PAGE_SIZE, bankId: 'all', searchTerm: '' }, signal)
  return toTransactionAccountOptions(page.items)
}

export const transactionsApi = { getTransactions, getTransactionById, getAccountOptions }
