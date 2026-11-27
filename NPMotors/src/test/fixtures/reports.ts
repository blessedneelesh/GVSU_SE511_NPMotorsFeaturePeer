import type { PeriodComparison, ProfitAndLossReport } from '../../types/reports'

// Raw ComparePeriods body, as the API sends it (Month, anchored on 2026-11-30)
export const rawComparison = {
  current: {
    period_Type: 'Month', start_Date: '2026-11-01T00:00:00', end_Date: '2026-11-30T00:00:00',
    revenue: { period_Type: 'Month', start_Date: '2026-11-01T00:00:00', end_Date: '2026-11-30T00:00:00', vehicle_Revenue: 367800, service_Revenue: 0, fee_Income: 4050, interest_Income: 0, other_Income: 0, discounts: 900, total_Revenue: 370950, invoice_Count: 9 },
    cogs: { period_Type: 'Month', start_Date: '2026-11-01T00:00:00', end_Date: '2026-11-30T00:00:00', vehicle_Cogs: 298640, parts_Cogs: 0, total_Cogs: 298640, vehicles_Sold_Count: 9 },
    operating_Expenses: { period_Type: 'Month', start_Date: '2026-11-01T00:00:00', end_Date: '2026-11-30T00:00:00', salary_Expense: 11900, bonus_Expense: 758.3333333333, commission_Expense: 9110, categorized_Payments: 2010, bank_Charges: 0, total_Operating_Expenses: 23778.3333333333 },
    total_Revenue: 370950, total_Cogs: 298640, gross_Profit: 72310, total_Operating_Expenses: 23778.3333333333,
    net_Profit: 48531.6666666667, gross_Margin: 19.49, net_Margin: 13.08, generated_Date: '2026-11-26T20:52:34.46-05:00', generated_By: '',
  },
  previous: {
    period_Type: 'Month', start_Date: '2026-10-01T00:00:00', end_Date: '2026-10-31T00:00:00',
    revenue: { period_Type: 'Month', start_Date: '2026-10-01T00:00:00', end_Date: '2026-10-31T00:00:00', vehicle_Revenue: 0, service_Revenue: 0, fee_Income: 0, interest_Income: 0, other_Income: 0, discounts: 0, total_Revenue: 0, invoice_Count: 0 },
    cogs: { period_Type: 'Month', start_Date: '2026-10-01T00:00:00', end_Date: '2026-10-31T00:00:00', vehicle_Cogs: 0, parts_Cogs: 0, total_Cogs: 0, vehicles_Sold_Count: 0 },
    operating_Expenses: { period_Type: 'Month', start_Date: '2026-10-01T00:00:00', end_Date: '2026-10-31T00:00:00', salary_Expense: 11900, bonus_Expense: 758.3333333333, commission_Expense: 0, categorized_Payments: 0, bank_Charges: 0, total_Operating_Expenses: 12658.3333333333 },
    total_Revenue: 0, total_Cogs: 0, gross_Profit: 0, total_Operating_Expenses: 12658.3333333333,
    net_Profit: -12658.3333333333, gross_Margin: null, net_Margin: null, generated_Date: '2026-11-26T20:52:34.52-05:00', generated_By: '',
  },
  revenue_Change_Pct: null,
  cogs_Change_Pct: null,
  gross_Profit_Change_Pct: null,
  operating_Expense_Change_Pct: 87.85,
  net_Profit_Change_Pct: 483.4,
  gross_Margin_Change: null,
  net_Margin_Change: null,
}

const november: ProfitAndLossReport = {
  periodType: 'Month', startDate: '2026-11-01', endDate: '2026-11-30',
  revenue: { periodType: 'Month', startDate: '2026-11-01', endDate: '2026-11-30', vehicleRevenue: 367800, serviceRevenue: 0, feeIncome: 4050, interestIncome: 0, otherIncome: 0, discounts: 900, totalRevenue: 370950, invoiceCount: 9 },
  cogs: { periodType: 'Month', startDate: '2026-11-01', endDate: '2026-11-30', vehicleCogs: 298640, partsCogs: 0, totalCogs: 298640, vehiclesSoldCount: 9 },
  operatingExpenses: { periodType: 'Month', startDate: '2026-11-01', endDate: '2026-11-30', salaryExpense: 11900, bonusExpense: 758.3333333333, commissionExpense: 9110, categorizedPayments: 2010, bankCharges: 0, totalOperatingExpenses: 23778.3333333333 },
  totalRevenue: 370950, totalCogs: 298640, grossProfit: 72310, totalOperatingExpenses: 23778.3333333333,
  netProfit: 48531.6666666667, grossMargin: 19.49, netMargin: 13.08, generatedDate: '2026-11-26T20:52:34.46-05:00',
}

const october: ProfitAndLossReport = {
  periodType: 'Month', startDate: '2026-10-01', endDate: '2026-10-31',
  revenue: { periodType: 'Month', startDate: '2026-10-01', endDate: '2026-10-31', vehicleRevenue: 0, serviceRevenue: 0, feeIncome: 0, interestIncome: 0, otherIncome: 0, discounts: 0, totalRevenue: 0, invoiceCount: 0 },
  cogs: { periodType: 'Month', startDate: '2026-10-01', endDate: '2026-10-31', vehicleCogs: 0, partsCogs: 0, totalCogs: 0, vehiclesSoldCount: 0 },
  operatingExpenses: { periodType: 'Month', startDate: '2026-10-01', endDate: '2026-10-31', salaryExpense: 11900, bonusExpense: 758.3333333333, commissionExpense: 0, categorizedPayments: 0, bankCharges: 0, totalOperatingExpenses: 12658.3333333333 },
  totalRevenue: 0, totalCogs: 0, grossProfit: 0, totalOperatingExpenses: 12658.3333333333,
  netProfit: -12658.3333333333, grossMargin: null, netMargin: null, generatedDate: '2026-11-26T20:52:34.52-05:00',
}

// rawComparison after mapPeriodComparison
export const monthComparison: PeriodComparison = {
  current: november,
  previous: october,
  revenueChangePct: null,
  cogsChangePct: null,
  grossProfitChangePct: null,
  operatingExpenseChangePct: 87.85,
  netProfitChangePct: 483.4,
  grossMarginChange: null,
  netMarginChange: null,
}
