import type { PaymentMethod } from './common'
import type { Receivable, ReceivableAgingStatus } from './receivables'

// The Deposit To choices, from GetAllBankAccounts (active accounts only; the API rejects an inactive one)
export interface ReceiptBankAccountOption {
  id: string
  name: string
  bankName: string
  accountNumber: string
  // Shown under the Bank Receipts "Bank Account" field
  bookBalance: number
}

// The AR invoice a payment is received against: what the dialog shows and checks the amount against
export interface ReceiptTarget {
  id: string
  number: string
  customerName: string
  amount: number
  paid: number
  balance: number
  agingStatus: ReceivableAgingStatus
}

// Form state: what the user types (ids and amount stay strings until the DTO), before it becomes RecordArPaymentRequest
export interface ReceiptFormValues {
  // YYYY-MM-DD
  receiptDate: string
  amount: string
  paymentMethod: PaymentMethod
  bankAccountId: string
  reference: string
}

export type ReceiptFormField = keyof ReceiptFormValues

// Bank Receipts "Received From": a customer (paid against one of their AR invoices) or any other party (a misc receipt)
export type ReceiptPartyType = 'customer' | 'other'

// The Bank Receipts form: the shared receipt fields plus who paid. Customer receipts use customerId + arInvoiceId;
// other-party receipts use payer + description.
export interface BankReceiptFormValues extends ReceiptFormValues {
  partyType: ReceiptPartyType
  customerId: string
  arInvoiceId: string
  payer: string
  description: string
}

export type BankReceiptFormField = keyof BankReceiptFormValues

// Keyed by every field either form can show; the Receive Payment dialog only uses the ReceiptFormValues ones
export type ReceiptFieldErrors = Partial<Record<BankReceiptFormField, string>>

export interface ReceiptSaveError {
  message: string
  fieldErrors: ReceiptFieldErrors
}

// POST Receipt/RecordArPayment/{arInvoiceId}
export interface ArPaymentRequest {
  arInvoiceId: string
  values: ReceiptFormValues
}

// POST Receipt/RecordMiscReceipt: money received from someone other than a customer invoice
export interface MiscReceiptRequest {
  payer: string
  description: string
  values: ReceiptFormValues
}

// A customer's open AR invoices (GetAllAr?CustomerId=), the Bank Receipts "Against Invoice" choices
export interface ReceiptCustomerInvoices {
  customerId: string
  invoices: Receivable[]
}

// A receipt stays in the history after ReverseTransaction, marked Reversed; only Posted ones count toward the paid amount
export type ReceiptPaymentStatus = 'Posted' | 'Reversed'

// One receipt posted against an AR invoice, from GET Receipt/GetPaymentHistory/{arInvoiceId}
export interface ReceiptPayment {
  id: string
  receiptNumber: string
  // YYYY-MM-DD
  receiptDate: string
  amount: number
  // null when the API sends a method this app doesn't know
  paymentMethod: PaymentMethod | null
  reference: string
  bankAccountName: string
  status: ReceiptPaymentStatus
}

export interface ReceiptPaymentHistory {
  arInvoiceId: string
  payments: ReceiptPayment[]
}

