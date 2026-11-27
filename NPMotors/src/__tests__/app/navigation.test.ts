import { describe, expect, it } from 'vitest'
import { navigationItems, sidebarGroups } from '../../app/navigation'

const sidebarLabels = () => sidebarGroups.flatMap((group) => group.items.map((item) => item.label))

describe('navigation', () => {
  it('leaves hidden items out of the sidebar', () => {
    expect(sidebarLabels()).not.toContain('Bank Reconciliation')
    expect(sidebarLabels()).not.toContain('Vehicle Profitability')
    expect(sidebarGroups.flatMap((group) => group.items).every((item) => !item.hidden)).toBe(true)
  })

  it('keeps hidden items routed, so in-app links to them still work', () => {
    const paths = navigationItems.map((item) => item.path)
    expect(paths).toContain('/bank-reconciliation')
    expect(paths).toContain('/vehicle-profitability')
  })

  it('keeps the visible sections and drops none of their items', () => {
    expect(sidebarGroups.map((group) => group.section)).toEqual(['Main', 'Sales', 'Purchases', 'Inventory', 'Banking', 'Reports'])
    expect(sidebarLabels()).toContain('Profit & Loss')
    expect(sidebarLabels()).toContain('Bank Transfers')
  })
})
