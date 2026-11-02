import type { Employee, EmployeeFormValues, EmployeePage, EmployeeSaveError } from '../../types/employees'

// Shaped like a real GetAllEmployees salesperson row; salary, bonus and commission differ so each stat is distinct
export const employee: Employee = {
  id: '12',
  firstName: 'Maria',
  lastName: 'Lopez',
  fullName: 'Maria Lopez',
  department: 'Sales',
  job: 'Sales Representative',
  salary: 52000,
  bonus: 1500,
  commissionRate: 2.5,
  isSalesperson: true,
  status: 'Active',
}

// Optional fields left empty, no id, no pay, inactive: exercises the '—' fallbacks and the disabled link
export const sparseEmployee: Employee = {
  id: '',
  firstName: 'Sam',
  lastName: 'Reed',
  fullName: 'Sam Reed',
  department: '',
  job: '',
  salary: 0,
  bonus: 0,
  commissionRate: 0,
  isSalesperson: false,
  status: 'Inactive',
}

export const employeePage: EmployeePage = {
  items: [employee, sparseEmployee],
  hasNext: true,
}

// Department and status are the form's defaults, so a filled-in form produces exactly these values
export const employeeFormValues: EmployeeFormValues = {
  firstName: 'Ann',
  lastName: 'Lee',
  department: 'Sales',
  job: 'Sales Representative',
  status: 'Active',
  salary: '41000',
  bonus: '500',
  commissionRate: '2.5',
}

export const employeeSaveError: EmployeeSaveError = {
  message: 'Something went wrong while saving.',
  fieldErrors: { firstName: 'The First_Name field is required.' },
}
