export type EmployeeStatus = 'Active' | 'Inactive'
export type EmployeeStatusFilter = 'all' | 'active' | 'inactive'

// Departments offered by the Figma design; the API stores department as free text and filters it case-insensitively
export type EmployeeDepartment = 'Accounting' | 'Administration' | 'Management' | 'Sales' | 'Service'
export type EmployeeDepartmentFilter = 'all' | EmployeeDepartment

export interface Employee {
  id: string
  firstName: string
  lastName: string
  fullName: string
  department: string
  job: string
  salary: number
  bonus: number
  commissionRate: number
  isSalesperson: boolean
  status: EmployeeStatus
}

export interface EmployeeQuery {
  pageNumber: number
  pageSize: number
  department: EmployeeDepartmentFilter
  status: EmployeeStatusFilter
  searchTerm: string
}

export interface EmployeePage {
  items: Employee[]
  hasNext: boolean
}

// Form state: what the user types (numbers stay strings until the DTO), before it becomes the API's EmployeeCreateDto
export interface EmployeeFormValues {
  firstName: string
  lastName: string
  department: EmployeeDepartment
  job: string
  status: EmployeeStatus
  salary: string
  bonus: string
  commissionRate: string
}

export type EmployeeFormField = keyof EmployeeFormValues

export type EmployeeFieldErrors = Partial<Record<EmployeeFormField, string>>

export interface EmployeeSaveError {
  message: string
  fieldErrors: EmployeeFieldErrors
}
