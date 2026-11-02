import { describe, expect, it } from 'vitest'
import { formatCurrency as customerFormatCurrency } from '../../../pages/CustomersPage/customerMetrics'
import { formatCurrency, VENDOR_TYPE_LABELS, VENDOR_TYPES } from '../../../pages/VendorsPage/vendorMetrics'

describe('vendorMetrics', () => {
  it('reuses the Customers currency format', () => {
    expect(formatCurrency).toBe(customerFormatCurrency)
    expect(formatCurrency(3500)).toBe('$3,500')
  })

  it('labels each API vendor type as the design does', () => {
    expect(VENDOR_TYPE_LABELS).toEqual({ vehicles: 'Vehicle', parts: 'Parts', service: 'Service' })
  })

  // The order drives the dropdowns, and matches the API enum (vehicles = 0, parts = 1, service = 2)
  it('lists the types in API enum order', () => {
    expect(VENDOR_TYPES).toEqual(['vehicles', 'parts', 'service'])
  })
})
