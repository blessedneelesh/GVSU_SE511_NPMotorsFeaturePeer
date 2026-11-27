// Period types the Report endpoints accept (Period_Type must match ^(Month|Quarter|YearToDate)$)
export type ReportPeriodType = 'Month' | 'Quarter' | 'YearToDate'

// The date range every report section carries
export interface ReportPeriod {
  periodType: ReportPeriodType
  startDate: string
  endDate: string
}

// GET Report/GetRevenue; totalRevenue is already net of discounts
export interface RevenueReport extends ReportPeriod {
  vehicleRevenue: number
  serviceRevenue: number
  feeIncome: number
  interestIncome: number
  otherIncome: number
  discounts: number
  totalRevenue: number
  invoiceCount: number
}

// GET Report/GetCostOfGoodsSold
export interface CogsReport extends ReportPeriod {
  vehicleCogs: number
  partsCogs: number
  totalCogs: number
  vehiclesSoldCount: number
}

// GET Report/GetOperatingExpenses
export interface OperatingExpensesReport extends ReportPeriod {
  salaryExpense: number
  bonusExpense: number
  commissionExpense: number
  categorizedPayments: number
  bankCharges: number
  totalOperatingExpenses: number
}

// GET Report/GetProfitAndLoss: the three sections above plus the totals. Margins are null when there is no revenue.
export interface ProfitAndLossReport extends ReportPeriod {
  revenue: RevenueReport
  cogs: CogsReport
  operatingExpenses: OperatingExpensesReport
  totalRevenue: number
  totalCogs: number
  grossProfit: number
  totalOperatingExpenses: number
  netProfit: number
  grossMargin: number | null
  netMargin: number | null
  generatedDate: string
}

// GET Report/ComparePeriods. Change percentages are null when the previous value is zero.
export interface PeriodComparison {
  current: ProfitAndLossReport
  previous: ProfitAndLossReport
  revenueChangePct: number | null
  cogsChangePct: number | null
  grossProfitChangePct: number | null
  operatingExpenseChangePct: number | null
  netProfitChangePct: number | null
  grossMarginChange: number | null
  netMarginChange: number | null
}

// What the Profit & Loss page asks for: a period type and the month it is anchored on ('YYYY-MM')
export interface ReportQuery {
  periodType: ReportPeriodType
  anchorMonth: string
}
