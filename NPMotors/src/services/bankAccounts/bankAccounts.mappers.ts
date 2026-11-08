import type { BankAccount, BankAccountFormValues, BankAccountStatus, BankAccountType, BankOption } from '../../types/bankAccounts'

// Accepted spellings per field: ASP.NET camelCase first, then PascalCase and snake_case
const DTO_FIELDS = {
  id: ['id', 'Id', 'bankAccountId', 'BankAccountId', 'bank_Account_Id'],
  bankId: ['bankId', 'BankId', 'bank_Id'],
  bankName: ['bankName', 'BankName', 'bank_Name'],
  name: ['name', 'Name', 'accountName', 'AccountName'],
  accountNumber: ['accountNumber', 'AccountNumber', 'account_Number'],
  type: ['type', 'Type', 'accountType', 'AccountType'],
  routing: ['routing', 'Routing', 'routingNumber', 'RoutingNumber'],
  bookBalance: ['bookBalance', 'BookBalance', 'book_Balance', 'balance', 'Balance'],
  status: ['status', 'Status'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type BankAccountDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type BankAccountDto = Partial<Record<BankAccountDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'bankAccounts', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: BankAccountDto, field: DtoField): unknown {
  const keys: readonly BankAccountDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: BankAccountDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: BankAccountDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeStatus(value: unknown): BankAccountStatus {
  return typeof value === 'string' && value.trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active'
}

// GetAllBankAccounts rows and GetBankAccountById share one shape: { id, bankId, bankName, name, accountNumber, type, routing, bookBalance, status }
export function mapBankAccount(raw: unknown): BankAccount {
  const dto: BankAccountDto = isRecord(raw) ? raw : {}

  return {
    id: readString(dto, 'id'),
    bankId: readString(dto, 'bankId'),
    bankName: readString(dto, 'bankName'),
    name: readString(dto, 'name') || 'Unnamed account',
    accountNumber: readString(dto, 'accountNumber'),
    type: readString(dto, 'type'),
    routing: readString(dto, 'routing'),
    bookBalance: readNumber(dto, 'bookBalance'),
    status: normalizeStatus(readField(dto, 'status')),
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

export function mapBankAccountCollection(body: unknown): BankAccount[] {
  return unwrapCollection(body).filter(isRecord).map(mapBankAccount)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// One option per bank that has at least one account, sorted by name; accounts without a bank id are left out
export function toBankOptions(accounts: BankAccount[]): BankOption[] {
  const banks = new Map<string, string>()
  for (const account of accounts) {
    if (account.bankId && !banks.has(account.bankId)) banks.set(account.bankId, account.bankName || `Bank ${account.bankId}`)
  }
  return [...banks].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
}

// Body of POST BankAccount/AddBankAccount (BankAccountCreateDto). Numbers must be JSON numbers;
// optional columns are nullable, so send null rather than ''.
export interface BankAccountCreateDto {
  bankId: number
  name: string
  accountNumber: string | null
  routing: string | null
  type: BankAccountType
  openingBalance: number
  status: 'active' | 'inactive'
}

const orNull = (value: string) => value.trim() || null

export function toBankAccountCreateDto(values: BankAccountFormValues): BankAccountCreateDto {
  return {
    bankId: Number(values.bankId),
    name: values.name.trim(),
    accountNumber: orNull(values.accountNumber),
    routing: orNull(values.routing),
    type: values.type,
    openingBalance: values.openingBalance.trim() ? Number(values.openingBalance) : 0,
    // The design has no status field; new accounts start active
    status: 'active',
  }
}
