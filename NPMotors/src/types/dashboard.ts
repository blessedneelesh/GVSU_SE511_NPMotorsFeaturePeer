import type { SalesInvoiceLifecycle, SalesInvoicePaymentStatus } from './salesInvoices'

// Available vehicles of one make (available_By_Make)
export interface MakeCount {
  make: string
  count: number
}

// One month of the revenue trend; month is 'YYYY-MM'
export interface MonthlyRevenue {
  month: string
  revenue: number
}

// A row of recent_Invoices: the sales invoice fields the dashboard shows
export interface DashboardInvoice {
  id: string
  number: string
  // YYYY-MM-DD, or '' when the API has none
  invoiceDate: string
  customerId: string
  customerName: string
  make: string
  model: string
  total: number
  balance: number
  lifecycle: SalesInvoiceLifecycle
  // null for drafts
  paymentStatus: SalesInvoicePaymentStatus | null
}

// GET Dashboard/GetSummary. Sales figures cover the calendar month of asOfDate (periodStart–periodEnd) and compare it
// with the month before; inventory, receivables and customers are point-in-time counts.
export interface DashboardSummary {
  asOfDate: string
  periodStart: string
  periodEnd: string
  totalInventory: number
  availableVehicles: number
  availableByMake: MakeCount[]
  vehiclesSold: number
  vehiclesSoldPrevious: number
  revenue: number
  revenuePrevious: number
  // Percent (14.6 = +14.6%); null when the previous month had no revenue
  revenueChangePct: number | null
  receivableBalance: number
  openReceivables: number
  activeCustomers: number
  // The last seven months, oldest first, ending with the asOfDate month
  monthlyRevenue: MonthlyRevenue[]
  recentInvoices: DashboardInvoice[]
}

// month is 'YYYY-MM'; the current month reports as of today (As_Of_Date is left out)
export interface DashboardQuery {
  month: string
}
