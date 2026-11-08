import type { BankAccount } from '../../types/bankAccounts'
import type { StatementLine, StatementLineAccountOption, StatementLineDirection } from '../../types/statementLines'

// Accepted spellings per field: the API's snake-ish camelCase first, then camelCase and PascalCase
const DTO_FIELDS = {
  id: ['id', 'Id', 'statementLineId', 'StatementLineId'],
  bankAccountId: ['bank_Account_Id', 'bankAccountId', 'BankAccountId', 'Bank_Account_Id'],
  bankAccountName: ['bank_Account_Name', 'bankAccountName', 'BankAccountName', 'Bank_Account_Name'],
  transactionId: ['transaction_Id', 'transactionId', 'TransactionId', 'Transaction_Id'],
  date: ['posted_Date', 'postedDate', 'PostedDate', 'Posted_Date', 'date', 'Date'],
  reference: ['bank_Reference', 'bankReference', 'BankReference', 'Bank_Reference', 'reference', 'Reference'],
  description: ['description', 'Description'],
  party: ['party', 'Party'],
  type: ['type', 'Type'],
  direction: ['direction', 'Direction'],
  deposit: ['deposit', 'Deposit'],
  withdrawal: ['withdrawal', 'Withdrawal'],
  runningBalance: ['running_Balance', 'runningBalance', 'RunningBalance', 'Running_Balance'],
  statementStatus: ['statement_Status', 'statementStatus', 'StatementStatus', 'Statement_Status'],
  matchStatus: ['match_Status', 'matchStatus', 'MatchStatus', 'Match_Status'],
  source: ['source', 'Source'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type StatementLineDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type StatementLineDto = Partial<Record<StatementLineDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'statementLines', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: StatementLineDto, field: DtoField): unknown {
  const keys: readonly StatementLineDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: StatementLineDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: StatementLineDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeDirection(value: unknown): StatementLineDirection {
  return typeof value === 'string' && value.trim().toLowerCase() === 'out' ? 'out' : 'in'
}

// The API mixes "BankReceipt" and "Bank Receipt"; split camel case so both read the same
export function normalizeType(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

// Statuses are title-cased ("cleared" becomes "Cleared")
export function normalizeStatus(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : ''
}

// "2024-03-01T00:00:00" -> "2024-03-01"; the time is always midnight
const toDateOnly = (value: string) => value.slice(0, 10)

export function mapStatementLine(raw: unknown): StatementLine {
  const dto: StatementLineDto = isRecord(raw) ? raw : {}

  return {
    id: readString(dto, 'id'),
    bankAccountId: readString(dto, 'bankAccountId'),
    bankAccountName: readString(dto, 'bankAccountName'),
    transactionId: readString(dto, 'transactionId'),
    date: toDateOnly(readString(dto, 'date')),
    reference: readString(dto, 'reference'),
    description: readString(dto, 'description'),
    party: readString(dto, 'party'),
    type: normalizeType(readString(dto, 'type')),
    direction: normalizeDirection(readField(dto, 'direction')),
    deposit: readNumber(dto, 'deposit'),
    withdrawal: readNumber(dto, 'withdrawal'),
    runningBalance: readNumber(dto, 'runningBalance'),
    statementStatus: normalizeStatus(readString(dto, 'statementStatus')),
    matchStatus: normalizeStatus(readString(dto, 'matchStatus')),
    source: readString(dto, 'source'),
  }
}

function unwrapCollection(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (!isRecord(body)) return []
  for (const key of COLLECTION_KEYS) {
    const value = body[key]
    if (Array.isArray(value)) return value
    if (isRecord(value)) {
      const nested = unwrapCollection(value)
      if (nested.length) return nested
    }
  }
  return []
}

export function mapStatementLineCollection(body: unknown): StatementLine[] {
  return unwrapCollection(body).filter(isRecord).map(mapStatementLine)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// Accounts without an id can't be filtered on, so they're left out
export function toStatementLineAccountOptions(accounts: BankAccount[]): StatementLineAccountOption[] {
  return accounts
    .filter((account) => account.id)
    .map((account) => ({
      id: account.id,
      name: account.name,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      type: account.type,
      routing: account.routing,
      bookBalance: account.bookBalance,
    }))
}
