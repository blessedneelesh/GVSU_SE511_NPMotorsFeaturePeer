import { describe, expect, it } from 'vitest'
import { formatCurrency as customerFormatCurrency } from '../../../pages/CustomersPage/customerMetrics'
import {
  formatCurrency,
  formatMargin,
  shortVin,
  VEHICLE_STATUS_BADGES,
  VEHICLE_STATUS_LABELS,
} from '../../../pages/VehiclesPage/vehicleMetrics'

describe('vehicleMetrics', () => {
  it('reuses the Customers currency format, losses included', () => {
    expect(formatCurrency).toBe(customerFormatCurrency)
    expect(formatCurrency(39500)).toBe('$39,500')
    expect(formatCurrency(-1200)).toBe('-$1,200')
  })

  it('labels every status', () => {
    expect(VEHICLE_STATUS_LABELS).toEqual({ available: 'Available', reserved: 'Reserved', sold: 'Sold' })
  })

  // Available green, Reserved amber, Sold red, as in the design
  it('maps every status to its badge colour', () => {
    expect(VEHICLE_STATUS_BADGES).toEqual({ available: 'badge-posted', reserved: 'badge-pending', sold: 'badge-cancelled' })
  })

  describe('formatMargin', () => {
    it.each([
      [11.4, '11.4%'],
      [11.24, '11.2%'],
      [0, '0.0%'],
      [-4, '-4.0%'],
    ])('formats %s as %s', (value, expected) => {
      expect(formatMargin(value)).toBe(expected)
    })
  })

  describe('shortVin', () => {
    it('keeps the last 8 characters', () => {
      expect(shortVin('1GCUYDED5NZ123456')).toBe('NZ123456')
    })

    it('keeps a VIN shorter than 8 characters whole', () => {
      expect(shortVin('ABC123')).toBe('ABC123')
      expect(shortVin('')).toBe('')
    })
  })
})
