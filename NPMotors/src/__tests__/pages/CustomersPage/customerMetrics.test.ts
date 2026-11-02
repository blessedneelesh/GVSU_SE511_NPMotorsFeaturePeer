import { describe, expect, it } from 'vitest'
import { formatCurrency, getInitials } from '../../../pages/CustomersPage/customerMetrics'
import { customer } from '../../../test/fixtures/customers'

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })

  it('rounds to whole dollars with thousands separators', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235')
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-500)).toBe('-$500')
  })
})

describe('getInitials', () => {
  it('uses the first letter of each name, uppercased', () => {
    expect(getInitials({ ...customer, firstName: 'john', lastName: 'smith' })).toBe('JS')
  })

  it('uses only the first name when the last name is missing', () => {
    expect(getInitials({ ...customer, lastName: '' })).toBe('J')
  })

  it('falls back to ? when both names are empty', () => {
    expect(getInitials({ ...customer, firstName: '', lastName: '' })).toBe('?')
  })
})
