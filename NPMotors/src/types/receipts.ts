import type { PaymentMethod } from './common'
import type { ReceivableAgingStatus } from './receivables'

// The Deposit To choices, from GetAllBankAccounts (active accounts only; the API rejects an inactive one)
export interface ReceiptBankAccountOption {
  id: string
  name: string
  bankName: string
  accountNumber: string
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

export type ReceiptFieldErrors = Partial<Record<ReceiptFormField, string>>

export interface ReceiptSaveError {
  message: string
  fieldErrors: ReceiptFieldErrors
}

// POST Receipt/RecordArPayment/{arInvoiceId}
export interface ArPaymentRequest {
  arInvoiceId: string
  values: ReceiptFormValues
}

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
}

export interface ReceiptPaymentHistory {
  arInvoiceId: string
  payments: ReceiptPayment[]
}

// Finds a sales invoice's receipts. GetSalesInvoiceById's ar_Invoice_Id is always null, so the AR invoice is looked up
// among the customer's receivables by its invoice number
export interface SalesInvoicePaymentsRequest {
  salesInvoiceId: string
  customerId: string
  invoiceNumber: string
}

export interface SalesInvoicePayments {
  salesInvoiceId: string
  payments: ReceiptPayment[]
}
