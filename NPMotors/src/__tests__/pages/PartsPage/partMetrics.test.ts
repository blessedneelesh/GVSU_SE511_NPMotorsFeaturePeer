import { describe, expect, it } from 'vitest'
import { formatCurrency as customerFormatCurrency } from '../../../pages/CustomersPage/customerMetrics'
import { formatCurrency, formatPrice, PART_CATEGORIES, stockBadge, stockLabel } from '../../../pages/PartsPage/partMetrics'

describe('partMetrics', () => {
  it('reuses the Customers whole-dollar currency format', () => {
    expect(formatCurrency).toBe(customerFormatCurrency)
    expect(formatCurrency(1540)).toBe('$1,540')
  })

  describe('formatPrice', () => {
    it.each([
      [38.5, '$38.50'],
      [69.99, '$69.99'],
      [1602, '$1,602.00'],
      [0, '$0.00'],
    ])('formats %s as %s', (value, expected) => {
      expect(formatPrice(value)).toBe(expected)
    })
  })

  it('offers the categories the existing parts use', () => {
    expect(PART_CATEGORIES).toEqual(['Accessories', 'Brakes', 'Electrical', 'Engine', 'Filters', 'Tires', 'Wheels'])
  })

  // Low Stock red, In Stock green, as in the design
  it.each([
    [true, 'Low Stock', 'badge-overdue'],
    [false, 'In Stock', 'badge-posted'],
  ])('labels isLowStock=%s as %s with %s', (isLowStock, label, badge) => {
    expect(stockLabel(isLowStock)).toBe(label)
    expect(stockBadge(isLowStock)).toBe(badge)
  })
})
