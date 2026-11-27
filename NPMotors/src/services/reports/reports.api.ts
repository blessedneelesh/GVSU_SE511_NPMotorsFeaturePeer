import { REPORT_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import type {
  CogsReport,
  OperatingExpensesReport,
  PeriodComparison,
  ProfitAndLossReport,
  ReportQuery,
  RevenueReport,
} from '../../types/reports'
import {
  mapCogsReport,
  mapOperatingExpensesReport,
  mapPeriodComparison,
  mapProfitAndLossReport,
  mapRevenueReport,
  toAnchorDate,
} from './reports.mappers'

interface ReportQueryParams {
  Period_Type: string
  Anchor_Date: string
}

interface ComparePeriodsParams {
  Period_Type: string
  Current_Anchor_Date: string
}

const toParams = (query: ReportQuery): ReportQueryParams => ({
  Period_Type: query.periodType,
  Anchor_Date: toAnchorDate(query.anchorMonth),
})

async function getRevenue(query: ReportQuery, signal?: AbortSignal): Promise<RevenueReport> {
  const { data } = await customerClient.get<unknown>(REPORT_ENDPOINTS.getRevenue, { params: toParams(query), signal })
  return mapRevenueReport(data)
}

async function getCostOfGoodsSold(query: ReportQuery, signal?: AbortSignal): Promise<CogsReport> {
  const { data } = await customerClient.get<unknown>(REPORT_ENDPOINTS.getCostOfGoodsSold, { params: toParams(query), signal })
  return mapCogsReport(data)
}

async function getOperatingExpenses(query: ReportQuery, signal?: AbortSignal): Promise<OperatingExpensesReport> {
  const { data } = await customerClient.get<unknown>(REPORT_ENDPOINTS.getOperatingExpenses, { params: toParams(query), signal })
  return mapOperatingExpensesReport(data)
}

async function getProfitAndLoss(query: ReportQuery, signal?: AbortSignal): Promise<ProfitAndLossReport> {
  const { data } = await customerClient.get<unknown>(REPORT_ENDPOINTS.getProfitAndLoss, { params: toParams(query), signal })
  return mapProfitAndLossReport(data)
}

// Previous_Anchor_Date is left out, so the API compares against the prior period of the same type
async function comparePeriods(query: ReportQuery, signal?: AbortSignal): Promise<PeriodComparison> {
  const params: ComparePeriodsParams = { Period_Type: query.periodType, Current_Anchor_Date: toAnchorDate(query.anchorMonth) }
  const { data } = await customerClient.get<unknown>(REPORT_ENDPOINTS.comparePeriods, { params, signal })
  return mapPeriodComparison(data)
}

export const reportsApi = { getRevenue, getCostOfGoodsSold, getOperatingExpenses, getProfitAndLoss, comparePeriods }
