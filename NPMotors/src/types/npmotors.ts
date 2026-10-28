export type SalesInvoiceStatus = 'Paid' | 'Partial' | 'Overdue' | 'Pending'

export interface SalesInvoice {
  id: string
  number: string
  date: string
  dueDate: string
  customerId: string
  customerName: string
  salesperson: string
  vehicle: string
  total: number
  paid: number
  balance: number
  status: SalesInvoiceStatus
}

export interface Invoice {
  id: string
  customer: string
  vehicle: string
  amount: number
  date: string
  status: 'Paid' | 'Pending'
}

export interface Vehicle {
  model: string
  category: string
  count: number
  percentage: number
  color: string
}

export interface DashboardMetrics {
  inventory: number
  available: number
  sold: number
  revenue: number
  receivable: number
  activeCustomers: number
}
