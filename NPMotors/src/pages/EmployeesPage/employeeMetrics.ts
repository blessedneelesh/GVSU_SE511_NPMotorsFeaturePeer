import type { Employee, EmployeeDepartment } from '../../types/employees'

// Same whole-dollar format as Customers
export { formatCurrency } from '../CustomersPage/customerMetrics'

// Department options from the Figma design, in its order
export const EMPLOYEE_DEPARTMENTS: EmployeeDepartment[] = ['Accounting', 'Administration', 'Management', 'Sales', 'Service']

export const getEmployeeInitials = (employee: Employee) =>
  `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase() || '?'

const percent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export const formatPercent = (value: number) => `${percent.format(value)}%`
