import { describe, expect, it } from 'vitest'
import {
  mapCogsReport,
  mapOperatingExpensesReport,
  mapPeriodComparison,
  mapProfitAndLossReport,
  mapRevenueReport,
  normalizePeriodType,
  toAnchorDate,
} from '../../../services/reports/reports.mappers'
import { monthComparison, rawComparison } from '../../../test/fixtures/reports'

describe('reports mappers', () => {
  it('maps a ComparePeriods body with nested sections, trimming dates to the day', () => {
    expect(mapPeriodComparison(rawComparison)).toEqual(monthComparison)
  })

  it('keeps null margins and change percentages as null', () => {
    const comparison = mapPeriodComparison(rawComparison)
    expect(comparison.previous.grossMargin).toBeNull()
    expect(comparison.revenueChangePct).toBeNull()
    expect(comparison.netProfitChangePct).toBe(483.4)
  })

  it('maps the standalone section reports', () => {
    expect(mapRevenueReport(rawComparison.current.revenue)).toEqual(monthComparison.current.revenue)
    expect(mapCogsReport(rawComparison.current.cogs)).toEqual(monthComparison.current.cogs)
    expect(mapOperatingExpensesReport(rawComparison.current.operating_Expenses)).toEqual(monthComparison.current.operatingExpenses)
  })

  it('accepts PascalCase and numeric strings', () => {
    const report = mapRevenueReport({ PeriodType: 'Quarter', StartDate: '2026-10-01', VehicleRevenue: '1500.5', TotalRevenue: 1500.5 })
    expect(report).toMatchObject({ periodType: 'Quarter', startDate: '2026-10-01', vehicleRevenue: 1500.5, totalRevenue: 1500.5 })
  })

  it('falls back to zeros and the report period for a missing or malformed body', () => {
    const report = mapProfitAndLossReport({ period_Type: 'YearToDate', start_Date: '2026-01-01T00:00:00', end_Date: '2026-11-30T00:00:00', total_Revenue: 'abc' })
    expect(report.totalRevenue).toBe(0)
    expect(report.netProfit).toBe(0)
    expect(report.grossMargin).toBeNull()
    expect(report.revenue).toMatchObject({ periodType: 'YearToDate', startDate: '2026-01-01', endDate: '2026-11-30', vehicleRevenue: 0 })
    expect(mapPeriodComparison(null).current.totalRevenue).toBe(0)
  })

  it('falls back to the section totals when the top-level totals are missing', () => {
    const report = mapProfitAndLossReport({ revenue: { total_Revenue: 10 }, cogs: { total_Cogs: 4 }, operating_Expenses: { total_Operating_Expenses: 3 } })
    expect(report).toMatchObject({ totalRevenue: 10, totalCogs: 4, totalOperatingExpenses: 3 })
  })

  it('normalizes the period type', () => {
    expect(normalizePeriodType('quarter')).toBe('Quarter')
    expect(normalizePeriodType('YearToDate')).toBe('YearToDate')
    expect(normalizePeriodType('ytd')).toBe('YearToDate')
    expect(normalizePeriodType(undefined)).toBe('Month')
  })

  it('anchors on the last day of the chosen month', () => {
    expect(toAnchorDate('2026-11')).toBe('2026-11-30')
    expect(toAnchorDate('2024-02')).toBe('2024-02-29')
    expect(toAnchorDate('2026-12')).toBe('2026-12-31')
    expect(toAnchorDate('garbage')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
