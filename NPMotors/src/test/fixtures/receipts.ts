import type { ReceiptBankAccountOption, ReceiptFormValues, ReceiptPayment, ReceiptTarget } from '../../types/receipts'

// Active accounts from GetAllBankAccounts, after mapping
export const receiptBankAccountOptions: ReceiptBankAccountOption[] = [
  { id: '1', name: 'Operating Checking', bankName: 'Chase', accountNumber: '****4521', bookBalance: 262733 },
  { id: '3', name: 'Payroll', bankName: 'Wells Fargo', accountNumber: '', bookBalance: 48250 },
]

// AR invoice 2471: partly paid and 7 days overdue
export const receiptTarget: ReceiptTarget = {
  id: '2471',
  number: 'AR-002471',
  customerName: 'Jennifer Brown',
  amount: 29350,
  paid: 1850,
  balance: 27500,
  agingStatus: 'Overdue',
}

export const receiptFormValues: ReceiptFormValues = {
  receiptDate: '2026-11-15',
  amount: '5000.50',
  paymentMethod: 'check',
  bankAccountId: '1',
  reference: '  CHK-1042 ',
}

// GetPaymentHistory for AR invoice 2471 after mapping, oldest first as the API sends them ($1,850 paid in all)
export const receiptPayments: ReceiptPayment[] = [
  { id: '461', receiptNumber: 'RCT-2026-000461', receiptDate: '2026-11-08', amount: 1200, paymentMethod: 'check', reference: 'INV-004262', bankAccountName: 'Operating Checking', status: 'Posted' },
  { id: '462', receiptNumber: 'RCT-2026-000462', receiptDate: '2026-11-10', amount: 650, paymentMethod: 'transfer', reference: '', bankAccountName: 'Business Savings', status: 'Posted' },
]
