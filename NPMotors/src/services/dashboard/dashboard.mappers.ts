import type { DashboardInvoice, DashboardSummary, MakeCount, MonthlyRevenue } from '../../types/dashboard'
import { normalizeLifecycle, normalizePaymentStatus } from '../salesInvoices/salesInvoices.mappers'

// Accepted spellings per field: ASP.NET camelCase (total_Inventory) first, then plain camelCase, PascalCase and snake_case
const DTO_FIELDS = {
  asOfDate: ['as_Of_Date', 'asOfDate', 'AsOfDate', 'As_Of_Date', 'as_of_date'],
  periodStart: ['period_Start', 'periodStart', 'PeriodStart', 'Period_Start', 'period_start'],
  periodEnd: ['period_End', 'periodEnd', 'PeriodEnd', 'Period_End', 'period_end'],
  totalInventory: ['total_Inventory', 'totalInventory', 'TotalInventory', 'Total_Inventory', 'total_inventory'],
  availableVehicles: ['available_Vehicles', 'availableVehicles', 'AvailableVehicles', 'Available_Vehicles', 'available_vehicles'],
  availableByMake: ['available_By_Make', 'availableByMake', 'AvailableByMake', 'Available_By_Make', 'available_by_make'],
  vehiclesSold: ['vehicles_Sold', 'vehiclesSold', 'VehiclesSold', 'Vehicles_Sold', 'vehicles_sold'],
  vehiclesSoldPrevious: ['vehicles_Sold_Previous', 'vehiclesSoldPrevious', 'VehiclesSoldPrevious', 'Vehicles_Sold_Previous', 'vehicles_sold_previous'],
  revenue: ['revenue', 'Revenue'],
  revenuePrevious: ['revenue_Previous', 'revenuePrevious', 'RevenuePrevious', 'Revenue_Previous', 'revenue_previous'],
  revenueChangePct: ['revenue_Change_Pct', 'revenueChangePct', 'RevenueChangePct', 'Revenue_Change_Pct', 'revenue_change_pct'],
  receivableBalance: ['receivable_Balance', 'receivableBalance', 'ReceivableBalance', 'Receivable_Balance', 'receivable_balance'],
  openReceivables: ['open_Receivables', 'openReceivables', 'OpenReceivables', 'Open_Receivables', 'open_receivables'],
  activeCustomers: ['active_Customers', 'activeCustomers', 'ActiveCustomers', 'Active_Customers', 'active_customers'],
  monthlyRevenue: ['monthly_Revenue', 'monthlyRevenue', 'MonthlyRevenue', 'Monthly_Revenue', 'monthly_revenue'],
  recentInvoices: ['recent_Invoices', 'recentInvoices', 'RecentInvoices', 'Recent_Invoices', 'recent_invoices'],
  // available_By_Make rows
  make: ['make', 'Make'],
  count: ['count', 'Count'],
  // monthly_Revenue rows
  month: ['month', 'Month'],
  // recent_Invoices rows
  id: ['id', 'Id', 'ID'],
  number: ['number', 'Number'],
  invoiceDate: ['invoice_Date', 'invoiceDate', 'InvoiceDate', 'Invoice_Date', 'invoice_date'],
  customerId: ['customer_Id', 'customerId', 'CustomerId', 'Customer_Id', 'customer_id'],
  customerName: ['customer_Name', 'customerName', 'CustomerName', 'Customer_Name', 'customer_name'],
  model: ['model', 'Model'],
  total: ['total', 'Total'],
  balance: ['balance', 'Balance'],
  lifecycle: ['lifecycle', 'Lifecycle'],
  paymentStatus: ['payment_Status', 'paymentStatus', 'PaymentStatus', 'Payment_Status', 'payment_status'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type DashboardDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type DashboardDto = Partial<Record<DashboardDtoKey, unknown>>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toDto = (raw: unknown): DashboardDto => (isRecord(raw) ? raw : {})

function readField(dto: DashboardDto, field: DtoField): unknown {
  const keys: readonly DashboardDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: DashboardDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

// null when the API sends null (revenue_Change_Pct with no previous revenue) or something that isn't a number
function readNullableNumber(dto: DashboardDto, field: DtoField): number | null {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

const readNumber = (dto: DashboardDto, field: DtoField): number => readNullableNumber(dto, field) ?? 0

// Dates arrive as "2026-11-26" or "2026-11-26T00:00:00"; keep just the calendar day
const readDate = (dto: DashboardDto, field: DtoField): string => readString(dto, field).slice(0, 10)

// A nested list field; anything that isn't an array maps to an empty list
function readList<T>(dto: DashboardDto, field: DtoField, map: (raw: unknown) => T): T[] {
  const value = readField(dto, field)
  return Array.isArray(value) ? value.map(map) : []
}

export function mapMakeCount(raw: unknown): MakeCount {
  const dto = toDto(raw)
  return { make: readString(dto, 'make'), count: readNumber(dto, 'count') }
}

export function mapMonthlyRevenue(raw: unknown): MonthlyRevenue {
  const dto = toDto(raw)
  return { month: readString(dto, 'month').slice(0, 7), revenue: readNumber(dto, 'revenue') }
}

export function mapDashboardInvoice(raw: unknown): DashboardInvoice {
  const dto = toDto(raw)
  const lifecycle = normalizeLifecycle(readField(dto, 'lifecycle'))
  return {
    id: readString(dto, 'id'),
    number: readString(dto, 'number'),
    invoiceDate: readDate(dto, 'invoiceDate'),
    customerId: readString(dto, 'customerId'),
    customerName: readString(dto, 'customerName'),
    make: readString(dto, 'make'),
    model: readString(dto, 'model'),
    total: readNumber(dto, 'total'),
    balance: readNumber(dto, 'balance'),
    lifecycle,
    // Drafts have no payment status
    paymentStatus: lifecycle === 'draft' ? null : normalizePaymentStatus(readField(dto, 'paymentStatus')),
  }
}

export function mapDashboardSummary(raw: unknown): DashboardSummary {
  const dto = toDto(raw)
  return {
    asOfDate: readDate(dto, 'asOfDate'),
    periodStart: readDate(dto, 'periodStart'),
    periodEnd: readDate(dto, 'periodEnd'),
    totalInventory: readNumber(dto, 'totalInventory'),
    availableVehicles: readNumber(dto, 'availableVehicles'),
    availableByMake: readList(dto, 'availableByMake', mapMakeCount),
    vehiclesSold: readNumber(dto, 'vehiclesSold'),
    vehiclesSoldPrevious: readNumber(dto, 'vehiclesSoldPrevious'),
    revenue: readNumber(dto, 'revenue'),
    revenuePrevious: readNumber(dto, 'revenuePrevious'),
    revenueChangePct: readNullableNumber(dto, 'revenueChangePct'),
    receivableBalance: readNumber(dto, 'receivableBalance'),
    openReceivables: readNumber(dto, 'openReceivables'),
    activeCustomers: readNumber(dto, 'activeCustomers'),
    monthlyRevenue: readList(dto, 'monthlyRevenue', mapMonthlyRevenue),
    recentInvoices: readList(dto, 'recentInvoices', mapDashboardInvoice),
  }
}

// The page picks a month ('YYYY-MM'). Today ('' or the current month) leaves As_Of_Date out so the API uses today;
// a past month is anchored on its last day, so its counts are as of month end. An invalid month also means today.
export function toAsOfDate(month: string, today: Date = new Date()): string | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return undefined
  const year = Number(match[1])
  const monthNumber = Number(match[2])
  if (year === today.getFullYear() && monthNumber === today.getMonth() + 1) return undefined
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}
