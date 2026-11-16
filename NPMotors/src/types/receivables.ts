// "Overdue" whenever the due date has passed, otherwise the AR invoice's own status
export type ReceivableAgingStatus = 'Overdue' | 'Partial' | 'Unpaid' | 'Paid'

// One AR invoice from GetAllAr; only open ones (balance > 0) unless the Status filter is "paid"
export interface Receivable {
  id: string
  // The AR invoice number (AR-…, or the legacy SI-/SVC- numbers)
  number: string
  customerId: string
  customerName: string
  // The sales invoice it was raised for
  invoiceNumber: string
  // YYYY-MM-DD
  dueDate: string
  amount: number
  paid: number
  balance: number
  // Days past due as of the query's date; 0 means not yet due
  daysOverdue: number
  agingStatus: ReceivableAgingStatus
}

// One AR invoice from GetArById: the list row's money fields plus the issue date and the customer's contact details
export interface ReceivableDetail {
  id: string
  // The sales invoice's id (not its number; GetArById doesn't return the number)
  invoiceId: string
  number: string
  customerName: string
  // YYYY-MM-DD; the AR invoice and its sales invoice share this date
  date: string
  // YYYY-MM-DD
  dueDate: string
  amount: number
  paid: number
  balance: number
  invoiceTotal: number
  daysOverdue: number
  agingStatus: ReceivableAgingStatus
  phone: string
  email: string
  address: string
}

// The API's Status values: 'all' = every open invoice; overdue = past due; unpaid/partial = that status and not yet due;
// paid = fully settled (balance 0), which every other value leaves out
export type ReceivableStatusFilter = 'all' | 'overdue' | 'unpaid' | 'partial' | 'paid'

// A customer id, or 'all' for every customer
export type ReceivableCustomerFilter = string

export interface ReceivableQuery {
  pageNumber: number
  pageSize: number
  status: ReceivableStatusFilter
  customerId: ReceivableCustomerFilter
  // YYYY-MM-DD, or '' for today (the API's default)
  asOfDate: string
}

export interface ReceivablePage {
  items: Receivable[]
  hasNext: boolean
}

// The customer filter's options, from GetAllCustomers
export interface ReceivableCustomerOption {
  id: string
  name: string
}
