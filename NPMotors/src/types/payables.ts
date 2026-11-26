// The bill's status as the list shows it. GetAllApBills sends "Overdue" once past due, otherwise the bill's own
// status (in mixed case: "unpaid", "Unpaid", "partial"). Settled bills are never returned, but "Paid" is kept so an
// unexpected one still gets a sensible badge.
export type PayableStatus = 'Overdue' | 'Partial' | 'Unpaid' | 'Paid'

// The API's aging buckets, by days past due as of the query's date
export type PayableAgingBucket = 'Current' | '1-30' | '31-60' | '61-90' | 'Over 90'

// One open AP bill from GetAllApBills
export interface Payable {
  id: string
  // The bill number (AP-…, or the legacy BILL- numbers)
  number: string
  vendorId: string
  vendorName: string
  // YYYY-MM-DD
  date: string
  // YYYY-MM-DD
  dueDate: string
  amount: number
  paid: number
  balance: number
  // Days past due as of the query's date; 0 means not yet due
  daysOverdue: number
  agingBucket: PayableAgingBucket
  status: PayableStatus
}

// The API's Status values: 'all' = every open bill; overdue = past due; unpaid/partial = that status and not yet due.
// It rejects anything else (there is no "paid").
export type PayableStatusFilter = 'all' | 'overdue' | 'unpaid' | 'partial'

// A vendor id, or 'all' for every vendor
export type PayableVendorFilter = string

export interface PayableQuery {
  pageNumber: number
  pageSize: number
  status: PayableStatusFilter
  vendorId: PayableVendorFilter
  // YYYY-MM-DD, or '' for today (the API's default)
  asOfDate: string
}

export interface PayablePage {
  items: Payable[]
  hasNext: boolean
}

// The vendor filter's options, from GetAllVendors
export interface PayableVendorOption {
  id: string
  name: string
}
