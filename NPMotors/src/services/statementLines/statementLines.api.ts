import { STATEMENT_LINE_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { bankAccountsApi } from '../bankAccounts/bankAccounts.api'
import type { StatementLineAccountOption, StatementLinePage, StatementLineQuery } from '../../types/statementLines'
import { mapStatementLineCollection, readHasNext, toStatementLineAccountOptions } from './statementLines.mappers'

interface StatementLineQueryParams {
  PageNumber: number
  PageSize: number
  BankAccountId?: string
  Month?: string
  Type?: string
}

// The API's largest page; accounts past the first 100 won't get a tab
const ACCOUNT_OPTIONS_PAGE_SIZE = 100

async function getStatementLines(query: StatementLineQuery, signal?: AbortSignal): Promise<StatementLinePage> {
  const params: StatementLineQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.bankAccountId !== 'all') params.BankAccountId = query.bankAccountId
  if (query.month) params.Month = query.month
  if (query.type !== 'all') params.Type = query.type

  const { data } = await customerClient.get<unknown>(STATEMENT_LINE_ENDPOINTS.getStatementLines, { params, signal })
  const items = mapStatementLineCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getAccountOptions(signal?: AbortSignal): Promise<StatementLineAccountOption[]> {
  const page = await bankAccountsApi.getBankAccounts({ pageNumber: 1, pageSize: ACCOUNT_OPTIONS_PAGE_SIZE, bankId: 'all', searchTerm: '' }, signal)
  return toStatementLineAccountOptions(page.items)
}

export const statementLinesApi = { getStatementLines, getAccountOptions }
