// "Overdue" whenever the due date has passed, otherwise the AR invoice's own status
export type ReceivableAgingStatus = 'Overdue' | 'Partial' | 'Unpaid' | 'Paid'

// One open AR invoice from GetAllAr; the API only returns rows with a balance
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

// The API's Status values: overdue = past due; unpaid/partial = that status and not yet due
export type ReceivableStatusFilter = 'all' | 'overdue' | 'unpaid' | 'partial'

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
