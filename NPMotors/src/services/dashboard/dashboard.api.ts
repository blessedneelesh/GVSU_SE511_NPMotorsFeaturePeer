import { DASHBOARD_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import type { DashboardQuery, DashboardSummary } from '../../types/dashboard'
import { mapDashboardSummary, toAsOfDate } from './dashboard.mappers'

interface DashboardSummaryParams {
  As_Of_Date?: string
}

// As_Of_Date is left out for the current month, so the API reports as of today
async function getDashboardSummary(query: DashboardQuery, signal?: AbortSignal): Promise<DashboardSummary> {
  const asOfDate = toAsOfDate(query.month)
  const params: DashboardSummaryParams = asOfDate ? { As_Of_Date: asOfDate } : {}
  const { data } = await customerClient.get<unknown>(DASHBOARD_ENDPOINTS.getSummary, { params, signal })
  return mapDashboardSummary(data)
}

export const dashboardApi = { getDashboardSummary }
