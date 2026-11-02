import { EMPLOYEE_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import type { Employee, EmployeeFormValues, EmployeePage, EmployeeQuery } from '../../types/employees'
import { mapEmployee, mapEmployeeCollection, readHasNext, toEmployeeCreateDto } from './employees.mappers'

interface EmployeeQueryParams {
  PageNumber: number
  PageSize: number
  Department?: string
  Status?: string
  SearchTerm?: string
}

async function getEmployees(query: EmployeeQuery, signal?: AbortSignal): Promise<EmployeePage> {
  const params: EmployeeQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.department !== 'all') params.Department = query.department
  if (query.status !== 'all') params.Status = query.status
  const searchTerm = query.searchTerm.trim()
  if (searchTerm) params.SearchTerm = searchTerm

  const { data } = await customerClient.get<unknown>(EMPLOYEE_ENDPOINTS.getAllEmployees, { params, signal })
  const items = mapEmployeeCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getEmployeeById(id: string, signal?: AbortSignal): Promise<Employee> {
  const { data } = await customerClient.get<unknown>(EMPLOYEE_ENDPOINTS.getEmployeeById, { params: { id }, signal })
  return mapEmployee(data)
}

// The list is refetched afterwards, so the response body isn't needed
async function addEmployee(values: EmployeeFormValues, signal?: AbortSignal): Promise<void> {
  await customerClient.post(EMPLOYEE_ENDPOINTS.addEmployee, toEmployeeCreateDto(values), { signal })
}

export const employeesApi = { getEmployees, getEmployeeById, addEmployee }
