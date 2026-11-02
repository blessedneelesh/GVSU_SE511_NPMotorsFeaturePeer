import { describe, expect, it } from 'vitest'
import { formatCurrency as customerFormatCurrency } from '../../../pages/CustomersPage/customerMetrics'
import { EMPLOYEE_DEPARTMENTS, formatCurrency, formatPercent, getEmployeeInitials } from '../../../pages/EmployeesPage/employeeMetrics'
import { employee } from '../../../test/fixtures/employees'

describe('employeeMetrics', () => {
  it('reuses the Customers currency format', () => {
    expect(formatCurrency).toBe(customerFormatCurrency)
    expect(formatCurrency(52000)).toBe('$52,000')
  })

  // The order drives both department dropdowns
  it('lists the design departments in its order', () => {
    expect(EMPLOYEE_DEPARTMENTS).toEqual(['Accounting', 'Administration', 'Management', 'Sales', 'Service'])
  })

  describe('getEmployeeInitials', () => {
    it('uses the first letter of each name in upper case', () => {
      expect(getEmployeeInitials(employee)).toBe('ML')
      expect(getEmployeeInitials({ ...employee, firstName: 'ann', lastName: 'lee' })).toBe('AL')
    })

    it('uses the one name there is', () => {
      expect(getEmployeeInitials({ ...employee, lastName: '' })).toBe('M')
    })

    it('falls back to "?" with no names', () => {
      expect(getEmployeeInitials({ ...employee, firstName: '', lastName: '' })).toBe('?')
    })
  })

  describe('formatPercent', () => {
    it.each([
      [0, '0%'],
      [2.5, '2.5%'],
      [1.236, '1.24%'],
      // The seed data stores commission rates like 2800
      [2800, '2,800%'],
    ])('formats %s as %s', (value, expected) => {
      expect(formatPercent(value)).toBe(expected)
    })
  })
})
