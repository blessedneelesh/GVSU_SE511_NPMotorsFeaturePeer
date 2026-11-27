import type {
  CogsReport,
  OperatingExpensesReport,
  PeriodComparison,
  ProfitAndLossReport,
  ReportPeriod,
  ReportPeriodType,
  RevenueReport,
} from '../../types/reports'

// Accepted spellings per field: ASP.NET camelCase (vehicle_Revenue) first, then plain camelCase, PascalCase and snake_case
const DTO_FIELDS = {
  periodType: ['period_Type', 'periodType', 'PeriodType', 'Period_Type', 'period_type'],
  startDate: ['start_Date', 'startDate', 'StartDate', 'Start_Date', 'start_date'],
  endDate: ['end_Date', 'endDate', 'EndDate', 'End_Date', 'end_date'],
  // Revenue
  vehicleRevenue: ['vehicle_Revenue', 'vehicleRevenue', 'VehicleRevenue', 'Vehicle_Revenue', 'vehicle_revenue'],
  serviceRevenue: ['service_Revenue', 'serviceRevenue', 'ServiceRevenue', 'Service_Revenue', 'service_revenue'],
  feeIncome: ['fee_Income', 'feeIncome', 'FeeIncome', 'Fee_Income', 'fee_income'],
  interestIncome: ['interest_Income', 'interestIncome', 'InterestIncome', 'Interest_Income', 'interest_income'],
  otherIncome: ['other_Income', 'otherIncome', 'OtherIncome', 'Other_Income', 'other_income'],
  discounts: ['discounts', 'Discounts'],
  totalRevenue: ['total_Revenue', 'totalRevenue', 'TotalRevenue', 'Total_Revenue', 'total_revenue'],
  invoiceCount: ['invoice_Count', 'invoiceCount', 'InvoiceCount', 'Invoice_Count', 'invoice_count'],
  // Cost of goods sold
  vehicleCogs: ['vehicle_Cogs', 'vehicleCogs', 'VehicleCogs', 'Vehicle_Cogs', 'vehicle_cogs'],
  partsCogs: ['parts_Cogs', 'partsCogs', 'PartsCogs', 'Parts_Cogs', 'parts_cogs'],
  totalCogs: ['total_Cogs', 'totalCogs', 'TotalCogs', 'Total_Cogs', 'total_cogs'],
  vehiclesSoldCount: ['vehicles_Sold_Count', 'vehiclesSoldCount', 'VehiclesSoldCount', 'Vehicles_Sold_Count', 'vehicles_sold_count'],
  // Operating expenses
  salaryExpense: ['salary_Expense', 'salaryExpense', 'SalaryExpense', 'Salary_Expense', 'salary_expense'],
  bonusExpense: ['bonus_Expense', 'bonusExpense', 'BonusExpense', 'Bonus_Expense', 'bonus_expense'],
  commissionExpense: ['commission_Expense', 'commissionExpense', 'CommissionExpense', 'Commission_Expense', 'commission_expense'],
  categorizedPayments: ['categorized_Payments', 'categorizedPayments', 'CategorizedPayments', 'Categorized_Payments', 'categorized_payments'],
  bankCharges: ['bank_Charges', 'bankCharges', 'BankCharges', 'Bank_Charges', 'bank_charges'],
  totalOperatingExpenses: ['total_Operating_Expenses', 'totalOperatingExpenses', 'TotalOperatingExpenses', 'Total_Operating_Expenses', 'total_operating_expenses'],
  // Profit and loss
  revenue: ['revenue', 'Revenue'],
  cogs: ['cogs', 'Cogs', 'COGS'],
  operatingExpenses: ['operating_Expenses', 'operatingExpenses', 'OperatingExpenses', 'Operating_Expenses', 'operating_expenses'],
  grossProfit: ['gross_Profit', 'grossProfit', 'GrossProfit', 'Gross_Profit', 'gross_profit'],
  netProfit: ['net_Profit', 'netProfit', 'NetProfit', 'Net_Profit', 'net_profit'],
  grossMargin: ['gross_Margin', 'grossMargin', 'GrossMargin', 'Gross_Margin', 'gross_margin'],
  netMargin: ['net_Margin', 'netMargin', 'NetMargin', 'Net_Margin', 'net_margin'],
  generatedDate: ['generated_Date', 'generatedDate', 'GeneratedDate', 'Generated_Date', 'generated_date'],
  // Period comparison
  current: ['current', 'Current'],
  previous: ['previous', 'Previous'],
  revenueChangePct: ['revenue_Change_Pct', 'revenueChangePct', 'RevenueChangePct', 'Revenue_Change_Pct', 'revenue_change_pct'],
  cogsChangePct: ['cogs_Change_Pct', 'cogsChangePct', 'CogsChangePct', 'Cogs_Change_Pct', 'cogs_change_pct'],
  grossProfitChangePct: ['gross_Profit_Change_Pct', 'grossProfitChangePct', 'GrossProfitChangePct', 'Gross_Profit_Change_Pct', 'gross_profit_change_pct'],
  operatingExpenseChangePct: ['operating_Expense_Change_Pct', 'operatingExpenseChangePct', 'OperatingExpenseChangePct', 'Operating_Expense_Change_Pct', 'operating_expense_change_pct'],
  netProfitChangePct: ['net_Profit_Change_Pct', 'netProfitChangePct', 'NetProfitChangePct', 'Net_Profit_Change_Pct', 'net_profit_change_pct'],
  grossMarginChange: ['gross_Margin_Change', 'grossMarginChange', 'GrossMarginChange', 'Gross_Margin_Change', 'gross_margin_change'],
  netMarginChange: ['net_Margin_Change', 'netMarginChange', 'NetMarginChange', 'Net_Margin_Change', 'net_margin_change'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type ReportDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type ReportDto = Partial<Record<ReportDtoKey, unknown>>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toDto = (raw: unknown): ReportDto => (isRecord(raw) ? raw : {})

function readField(dto: ReportDto, field: DtoField): unknown {
  const keys: readonly ReportDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: ReportDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

// null when the API sends null (e.g. a margin with no revenue) or something that isn't a number
function readNullableNumber(dto: ReportDto, field: DtoField): number | null {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

const readNumber = (dto: ReportDto, field: DtoField): number => readNullableNumber(dto, field) ?? 0

// Dates arrive as "2026-11-01T00:00:00"; keep just the calendar day
const readDate = (dto: ReportDto, field: DtoField): string => readString(dto, field).slice(0, 10)

export function normalizePeriodType(value: unknown): ReportPeriodType {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (text === 'quarter') return 'Quarter'
  if (text === 'yeartodate' || text === 'ytd') return 'YearToDate'
  return 'Month'
}

function mapPeriod(dto: ReportDto): ReportPeriod {
  return {
    periodType: normalizePeriodType(readField(dto, 'periodType')),
    startDate: readDate(dto, 'startDate'),
    endDate: readDate(dto, 'endDate'),
  }
}

export function mapRevenueReport(raw: unknown): RevenueReport {
  const dto = toDto(raw)
  return {
    ...mapPeriod(dto),
    vehicleRevenue: readNumber(dto, 'vehicleRevenue'),
    serviceRevenue: readNumber(dto, 'serviceRevenue'),
    feeIncome: readNumber(dto, 'feeIncome'),
    interestIncome: readNumber(dto, 'interestIncome'),
    otherIncome: readNumber(dto, 'otherIncome'),
    discounts: readNumber(dto, 'discounts'),
    totalRevenue: readNumber(dto, 'totalRevenue'),
    invoiceCount: readNumber(dto, 'invoiceCount'),
  }
}

export function mapCogsReport(raw: unknown): CogsReport {
  const dto = toDto(raw)
  return {
    ...mapPeriod(dto),
    vehicleCogs: readNumber(dto, 'vehicleCogs'),
    partsCogs: readNumber(dto, 'partsCogs'),
    totalCogs: readNumber(dto, 'totalCogs'),
    vehiclesSoldCount: readNumber(dto, 'vehiclesSoldCount'),
  }
}

export function mapOperatingExpensesReport(raw: unknown): OperatingExpensesReport {
  const dto = toDto(raw)
  return {
    ...mapPeriod(dto),
    salaryExpense: readNumber(dto, 'salaryExpense'),
    bonusExpense: readNumber(dto, 'bonusExpense'),
    commissionExpense: readNumber(dto, 'commissionExpense'),
    categorizedPayments: readNumber(dto, 'categorizedPayments'),
    bankCharges: readNumber(dto, 'bankCharges'),
    totalOperatingExpenses: readNumber(dto, 'totalOperatingExpenses'),
  }
}

export function mapProfitAndLossReport(raw: unknown): ProfitAndLossReport {
  const dto = toDto(raw)
  const period = mapPeriod(dto)
  // A section without its own dates belongs to the report's period
  const section = <T extends ReportPeriod>(value: T): T => (value.startDate ? value : { ...value, ...period })
  const revenue = section(mapRevenueReport(readField(dto, 'revenue')))
  const cogs = section(mapCogsReport(readField(dto, 'cogs')))
  const operatingExpenses = section(mapOperatingExpensesReport(readField(dto, 'operatingExpenses')))

  return {
    ...period,
    revenue,
    cogs,
    operatingExpenses,
    // The top-level totals win; fall back to the sections' own totals if they're missing
    totalRevenue: readNullableNumber(dto, 'totalRevenue') ?? revenue.totalRevenue,
    totalCogs: readNullableNumber(dto, 'totalCogs') ?? cogs.totalCogs,
    grossProfit: readNumber(dto, 'grossProfit'),
    totalOperatingExpenses: readNullableNumber(dto, 'totalOperatingExpenses') ?? operatingExpenses.totalOperatingExpenses,
    netProfit: readNumber(dto, 'netProfit'),
    grossMargin: readNullableNumber(dto, 'grossMargin'),
    netMargin: readNullableNumber(dto, 'netMargin'),
    generatedDate: readString(dto, 'generatedDate'),
  }
}

export function mapPeriodComparison(raw: unknown): PeriodComparison {
  const dto = toDto(raw)
  return {
    current: mapProfitAndLossReport(readField(dto, 'current')),
    previous: mapProfitAndLossReport(readField(dto, 'previous')),
    revenueChangePct: readNullableNumber(dto, 'revenueChangePct'),
    cogsChangePct: readNullableNumber(dto, 'cogsChangePct'),
    grossProfitChangePct: readNullableNumber(dto, 'grossProfitChangePct'),
    operatingExpenseChangePct: readNullableNumber(dto, 'operatingExpenseChangePct'),
    netProfitChangePct: readNullableNumber(dto, 'netProfitChangePct'),
    grossMarginChange: readNullableNumber(dto, 'grossMarginChange'),
    netMarginChange: readNullableNumber(dto, 'netMarginChange'),
  }
}

// The page picks a month ('YYYY-MM'); anchor every report on its last day, so Year to Date runs through the whole month.
// An invalid month falls back to the current one.
export function toAnchorDate(anchorMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(anchorMonth)
  const today = new Date()
  const year = match ? Number(match[1]) : today.getFullYear()
  const month = match ? Number(match[2]) : today.getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}
