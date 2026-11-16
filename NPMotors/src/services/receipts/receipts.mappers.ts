import type { BankAccount } from '../../types/bankAccounts'
import type { PaymentMethod } from '../../types/common'
import type { ReceiptBankAccountOption, ReceiptFormValues, ReceiptPayment } from '../../types/receipts'

// Only active accounts can take a deposit; accounts without an id can't be posted to
export function toReceiptBankAccountOptions(accounts: BankAccount[]): ReceiptBankAccountOption[] {
  return accounts
    .filter((account) => account.id && account.status === 'Active')
    .map((account) => ({
      id: account.id,
      name: account.name,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
    }))
}

// Body of POST Receipt/RecordArPayment/{arInvoiceId} (RecordArPaymentRequest). The amount and account id must be
// JSON numbers, the method a camelCase enum name; reference is nullable, so send null rather than ''.
export interface RecordArPaymentDto {
  // YYYY-MM-DD; ASP.NET binds it to a midnight DateTime
  receiptDate: string
  amount: number
  paymentMethod: PaymentMethod
  reference: string | null
  bankAccountId: number
}

export function toRecordArPaymentDto(values: ReceiptFormValues): RecordArPaymentDto {
  return {
    receiptDate: values.receiptDate,
    amount: Number(values.amount),
    paymentMethod: values.paymentMethod,
    reference: values.reference.trim() || null,
    bankAccountId: Number(values.bankAccountId),
  }
}

// GetPaymentHistory answers { id, number, ..., payments: [...] }; the invoice header comes from GetArById, so only the payments are read
const PAYMENT_FIELDS = {
  id: ['id', 'Id'],
  receiptNumber: ['receiptNumber', 'ReceiptNumber', 'receipt_Number', 'Receipt_Number'],
  receiptDate: ['receiptDate', 'ReceiptDate', 'receipt_Date', 'Receipt_Date'],
  amount: ['amount', 'Amount'],
  paymentMethod: ['paymentMethod', 'PaymentMethod', 'payment_Method', 'Payment_Method'],
  reference: ['reference', 'Reference'],
  bankAccountName: ['bankAccountName', 'BankAccountName', 'bank_Account_Name', 'Bank_Account_Name'],
} as const

type PaymentField = keyof typeof PAYMENT_FIELDS

const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'transfer', 'check']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readPaymentField(dto: Record<string, unknown>, field: PaymentField): unknown {
  for (const key of PAYMENT_FIELDS[field]) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readPaymentString(dto: Record<string, unknown>, field: PaymentField): string {
  const value = readPaymentField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readPaymentNumber(dto: Record<string, unknown>, field: PaymentField): number {
  const value = readPaymentField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

// The API sends camelCase enum names ("transfer"); match any casing, and keep unknown methods as null
function readPaymentMethod(dto: Record<string, unknown>): PaymentMethod | null {
  const value = readPaymentString(dto, 'paymentMethod').toLowerCase()
  return PAYMENT_METHODS.find((method) => method === value) ?? null
}

export function mapReceiptPayment(dto: Record<string, unknown>): ReceiptPayment {
  return {
    id: readPaymentString(dto, 'id'),
    receiptNumber: readPaymentString(dto, 'receiptNumber'),
    // "2026-11-08T00:00:00" -> "2026-11-08"; the time is always midnight
    receiptDate: readPaymentString(dto, 'receiptDate').slice(0, 10),
    amount: readPaymentNumber(dto, 'amount'),
    paymentMethod: readPaymentMethod(dto),
    reference: readPaymentString(dto, 'reference'),
    bankAccountName: readPaymentString(dto, 'bankAccountName'),
  }
}

// Accepts the documented { payments } body, or a bare array of receipts; anything else is no payments
export function mapPaymentHistory(body: unknown): ReceiptPayment[] {
  const list = isRecord(body) ? (body.payments ?? body.Payments) : body
  return Array.isArray(list) ? list.filter(isRecord).map(mapReceiptPayment) : []
}
