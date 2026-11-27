import { describe, expect, it } from 'vitest'
import { mapDashboardInvoice, mapDashboardSummary, toAsOfDate } from '../../../services/dashboard/dashboard.mappers'
import { summary, summaryDto } from '../../../test/fixtures/dashboard'

describe('mapDashboardSummary', () => {
  it('maps the API response', () => {
    expect(mapDashboardSummary(summaryDto)).toEqual(summary)
  })

  it('keeps a reported revenue change and reads numeric strings', () => {
    const mapped = mapDashboardSummary({ ...summaryDto, revenue_Change_Pct: 14.6, total_Inventory: '30' })
    expect(mapped.revenueChangePct).toBe(14.6)
    expect(mapped.totalInventory).toBe(30)
  })

  it('accepts PascalCase fields', () => {
    expect(mapDashboardSummary({ TotalInventory: 4, AvailableByMake: [{ Make: 'Kia', Count: 2 }] })).toMatchObject({
      totalInventory: 4,
      availableByMake: [{ make: 'Kia', count: 2 }],
    })
  })

  it('falls back to empty values for a missing or malformed body', () => {
    const empty = mapDashboardSummary(null)
    expect(empty).toMatchObject({ asOfDate: '', totalInventory: 0, revenueChangePct: null, availableByMake: [], monthlyRevenue: [], recentInvoices: [] })
    expect(mapDashboardSummary({ recent_Invoices: 'nope', monthly_Revenue: {} }).recentInvoices).toEqual([])
  })
})

describe('mapDashboardInvoice', () => {
  it('drops the payment status of a draft', () => {
    expect(mapDashboardInvoice({ id: 1, lifecycle: 'draft', payment_Status: 'unpaid' })).toMatchObject({ lifecycle: 'draft', paymentStatus: null })
  })
})

describe('toAsOfDate', () => {
  const today = new Date(2026, 10, 26)

  it('leaves the current month out, so the API reports as of today', () => {
    expect(toAsOfDate('2026-11', today)).toBeUndefined()
  })

  it('anchors a past month on its last day', () => {
    expect(toAsOfDate('2026-02', today)).toBe('2026-02-28')
    expect(toAsOfDate('2025-12', today)).toBe('2025-12-31')
  })

  it('treats an invalid month as today', () => {
    expect(toAsOfDate('', today)).toBeUndefined()
    expect(toAsOfDate('November', today)).toBeUndefined()
  })
})
