import { beforeEach, describe, expect, it, vi } from 'vitest'
import { customerClient } from '../../../services/api/customerClient'
import { reportsApi } from '../../../services/reports/reports.api'
import { monthComparison, rawComparison } from '../../../test/fixtures/reports'
import type { ReportQuery } from '../../../types/reports'

vi.mock('../../../services/api/customerClient', () => ({ customerClient: { get: vi.fn() } }))

const get = vi.mocked(customerClient.get)
const query: ReportQuery = { periodType: 'Quarter', anchorMonth: '2026-11' }

describe('reportsApi', () => {
  beforeEach(() => { get.mockReset() })

  it('comparePeriods sends the period type and current anchor only, and maps the body', async () => {
    get.mockResolvedValue({ data: rawComparison })
    const signal = new AbortController().signal
    await expect(reportsApi.comparePeriods(query, signal)).resolves.toEqual(monthComparison)
    expect(get).toHaveBeenCalledWith('Report/ComparePeriods', { params: { Period_Type: 'Quarter', Current_Anchor_Date: '2026-11-30' }, signal })
  })

  it.each([
    ['getRevenue', 'Report/GetRevenue', rawComparison.current.revenue, monthComparison.current.revenue],
    ['getCostOfGoodsSold', 'Report/GetCostOfGoodsSold', rawComparison.current.cogs, monthComparison.current.cogs],
    ['getOperatingExpenses', 'Report/GetOperatingExpenses', rawComparison.current.operating_Expenses, monthComparison.current.operatingExpenses],
    ['getProfitAndLoss', 'Report/GetProfitAndLoss', rawComparison.current, monthComparison.current],
  ] as const)('%s calls %s with Period_Type and Anchor_Date', async (method, endpoint, body, expected) => {
    get.mockResolvedValue({ data: body })
    await expect(reportsApi[method](query)).resolves.toEqual(expected)
    expect(get).toHaveBeenCalledWith(endpoint, { params: { Period_Type: 'Quarter', Anchor_Date: '2026-11-30' }, signal: undefined })
  })
})
