import type { DashboardSummary } from '../../types/dashboard'

// GET Dashboard/GetSummary?As_Of_Date=2026-11-26 as the API returns it (trimmed to two invoices)
export const summaryDto = {
  as_Of_Date: '2026-11-26',
  period_Start: '2026-11-01',
  period_End: '2026-11-30',
  total_Inventory: 28,
  available_Vehicles: 9,
  available_By_Make: [{ make: 'Toyota', count: 5 }, { make: 'Honda', count: 2 }, { make: 'Ford', count: 1 }, { make: 'Kia', count: 1 }],
  vehicles_Sold: 9,
  vehicles_Sold_Previous: 6,
  revenue: 370950.0,
  revenue_Previous: 0,
  revenue_Change_Pct: null,
  receivable_Balance: 321651.0,
  open_Receivables: 14,
  active_Customers: 16,
  monthly_Revenue: [
    { month: '2026-05', revenue: 0 },
    { month: '2026-06', revenue: 0 },
    { month: '2026-07', revenue: 0 },
    { month: '2026-08', revenue: 0 },
    { month: '2026-09', revenue: 0 },
    { month: '2026-10', revenue: 0 },
    { month: '2026-11', revenue: 370950.0 },
  ],
  recent_Invoices: [
    {
      id: 5872, number: 'INV-005872', invoice_Date: '2026-11-26T00:00:00', due_Date: '2026-12-26T00:00:00', customer_Id: 9,
      customer_Name: 'Sarah Johnson', salesperson_Id: 9, vehicle_Id: 16, vin: '4T1DZ1FB6RU094182', make: 'Toyota', model: 'Avalon',
      total: 52082.0, paid: 52.0, balance: 52030.0, lifecycle: 'posted', payment_Status: 'partial',
    },
    {
      id: 5871, number: 'INV-005871', invoice_Date: '2026-11-25T00:00:00', due_Date: '2026-12-25T00:00:00', customer_Id: 2,
      customer_Name: 'Michael Chen', salesperson_Id: 10, vehicle_Id: 20, vin: '5TDKDRBH1RS539672', make: 'Honda', model: 'Civic',
      total: 31000.0, paid: 31000.0, balance: 0, lifecycle: 'posted', payment_Status: 'paid',
    },
  ],
}

export const summary: DashboardSummary = {
  asOfDate: '2026-11-26',
  periodStart: '2026-11-01',
  periodEnd: '2026-11-30',
  totalInventory: 28,
  availableVehicles: 9,
  availableByMake: [{ make: 'Toyota', count: 5 }, { make: 'Honda', count: 2 }, { make: 'Ford', count: 1 }, { make: 'Kia', count: 1 }],
  vehiclesSold: 9,
  vehiclesSoldPrevious: 6,
  revenue: 370950,
  revenuePrevious: 0,
  revenueChangePct: null,
  receivableBalance: 321651,
  openReceivables: 14,
  activeCustomers: 16,
  monthlyRevenue: [
    { month: '2026-05', revenue: 0 },
    { month: '2026-06', revenue: 0 },
    { month: '2026-07', revenue: 0 },
    { month: '2026-08', revenue: 0 },
    { month: '2026-09', revenue: 0 },
    { month: '2026-10', revenue: 0 },
    { month: '2026-11', revenue: 370950 },
  ],
  recentInvoices: [
    {
      id: '5872', number: 'INV-005872', invoiceDate: '2026-11-26', customerId: '9', customerName: 'Sarah Johnson',
      make: 'Toyota', model: 'Avalon', total: 52082, balance: 52030, lifecycle: 'posted', paymentStatus: 'partial',
    },
    {
      id: '5871', number: 'INV-005871', invoiceDate: '2026-11-25', customerId: '2', customerName: 'Michael Chen',
      make: 'Honda', model: 'Civic', total: 31000, balance: 0, lifecycle: 'posted', paymentStatus: 'paid',
    },
  ],
}
