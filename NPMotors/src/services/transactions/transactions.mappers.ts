import type { BankAccount } from '../../types/bankAccounts'
import type { Transaction, TransactionAccountOption, TransactionDirection } from '../../types/transactions'

// Accepted spellings per field: the API's snake-ish camelCase first, then camelCase and PascalCase
const DTO_FIELDS = {
  id: ['id', 'Id', 'transactionId', 'TransactionId'],
  number: ['number', 'Number', 'transactionNumber', 'TransactionNumber'],
  bankAccountId: ['bank_Account_Id', 'bankAccountId', 'BankAccountId', 'Bank_Account_Id'],
  bankAccountName: ['bank_Account_Name', 'bankAccountName', 'BankAccountName', 'Bank_Account_Name'],
  type: ['type', 'Type', 'sourceType', 'SourceType'],
  sourceNumber: ['source_Number', 'sourceNumber', 'SourceNumber', 'Source_Number'],
  direction: ['direction', 'Direction'],
  date: ['date', 'Date'],
  party: ['party', 'Party'],
  amount: ['amount', 'Amount'],
  description: ['description', 'Description'],
  status: ['status', 'Status'],
  createdAt: ['created_At', 'createdAt', 'CreatedAt', 'Created_At'],
  createdBy: ['created_By', 'createdBy', 'CreatedBy', 'Created_By'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type TransactionDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type TransactionDto = Partial<Record<TransactionDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'transactions', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: TransactionDto, field: DtoField): unknown {
  const keys: readonly TransactionDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: TransactionDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: TransactionDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeDirection(value: unknown): TransactionDirection {
  return typeof value === 'string' && value.trim().toLowerCase() === 'out' ? 'out' : 'in'
}

// The API mixes "BankReceipt" and "Bank Receipt"; split camel case so both read the same
export function normalizeType(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

// The API mixes "posted" and "Posted"
export function normalizeStatus(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : ''
}

// "2026-11-08T00:00:00" -> "2026-11-08"; the time is always midnight
const toDateOnly = (value: string) => value.slice(0, 10)

// GetAllTransactions rows and GetTransactionById share one shape (a bare object for the latter)
export function mapTransaction(raw: unknown): Transaction {
  const dto: TransactionDto = isRecord(raw) ? raw : {}

  return {
    id: readString(dto, 'id'),
    number: readString(dto, 'number'),
    bankAccountId: readString(dto, 'bankAccountId'),
    bankAccountName: readString(dto, 'bankAccountName'),
    type: normalizeType(readString(dto, 'type')),
    sourceNumber: readString(dto, 'sourceNumber'),
    direction: normalizeDirection(readField(dto, 'direction')),
    date: toDateOnly(readString(dto, 'date')),
    party: readString(dto, 'party'),
    amount: readNumber(dto, 'amount'),
    description: readString(dto, 'description'),
    status: normalizeStatus(readString(dto, 'status')),
    createdAt: readString(dto, 'createdAt'),
    createdBy: readString(dto, 'createdBy'),
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

export function mapTransactionCollection(body: unknown): Transaction[] {
  return unwrapCollection(body).filter(isRecord).map(mapTransaction)
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
export function toTransactionAccountOptions(accounts: BankAccount[]): TransactionAccountOption[] {
  return accounts
    .filter((account) => account.id)
    .map((account) => ({ id: account.id, name: account.name, accountNumber: account.accountNumber }))
}
