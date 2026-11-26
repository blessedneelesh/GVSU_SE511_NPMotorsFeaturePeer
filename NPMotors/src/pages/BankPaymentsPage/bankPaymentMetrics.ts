import type { PaymentMethod } from '../../types/common'

// Same account labels, cents formatting, method labels and date helper as Bank Receipts
export {
  bankAccountLabel,
  formatCurrencyExact,
  paymentMethodLabel,
  paymentMethodOptions,
  todayIsoDate,
  toCents,
} from '../BankReceiptsPage/bankReceiptMetrics'

// The design's "Payment Purpose / Debit Account" choices: its expense and liability accounts. There is no chart of
// accounts endpoint, so they're listed here; the name is sent as payment_Category (50 characters max).
// Accounts Payable is left out: paying a vendor bill goes through "Paid To: Vendor".
export const paymentCategoryOptions: { code: string; name: string }[] = [
  { code: '2100', name: 'Salaries Payable' },
  { code: '2200', name: 'Sales Tax Payable' },
  { code: '2300', name: 'Income Tax Payable' },
  { code: '2400', name: 'Floor Plan Loan Payable' },
  { code: '2500', name: 'Mortgage Payable' },
  { code: '5000', name: 'Cost of Vehicles Sold' },
  { code: '5100', name: 'Cost of Parts Sold' },
  { code: '6000', name: 'Salary Expense' },
  { code: '6100', name: 'Commission Expense' },
  { code: '6200', name: 'Rent Expense' },
  { code: '6300', name: 'Utilities Expense' },
  { code: '6400', name: 'Advertising Expense' },
  { code: '6500', name: 'Insurance Expense' },
  { code: '6600', name: 'Vehicle Maintenance Expense' },
  { code: '6700', name: 'Travel Expense' },
  { code: '6800', name: 'Bank Charges' },
  { code: '6900', name: 'Depreciation Expense' },
  { code: '7000', name: 'Office Expense' },
  { code: '7100', name: 'Professional Fees' },
  { code: '7900', name: 'Other Expenses' },
]

export const paymentCategoryLabel = (option: { code: string; name: string }) => `${option.code} — ${option.name}`

// What the success card shows; copied at submit time because the lists refetch after posting
export interface PostedBankPayment {
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  bankAccountName: string
  // The account's balance before the payment, so the card can show the new one
  balanceBefore: number | null
  payeeName: string
  // Vendor payments only
  billNumber: string
  // Other-party payments only
  paymentCategory: string
  reference: string
}
