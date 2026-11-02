import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadEmployees,
  setEmployeeDepartmentFilter,
  setEmployeePage,
  setEmployeePageSize,
  setEmployeeSearch,
  setEmployeeStatusFilter,
} from '../redux/employees/employees.actions'
import {
  selectEmployeeHasNext,
  selectEmployeeListError,
  selectEmployeeListStatus,
  selectEmployeeQuery,
  selectEmployees,
} from '../redux/employees/employees.selectors'
import type { RequestStatus } from '../types/common'
import type { Employee, EmployeeDepartmentFilter, EmployeeQuery, EmployeeStatusFilter } from '../types/employees'

const SEARCH_DEBOUNCE_MS = 300

export interface UseEmployeesResult {
  employees: Employee[]
  query: EmployeeQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  searchInput: string
  setSearchInput: (value: string) => void
  setDepartmentFilter: (department: EmployeeDepartmentFilter) => void
  setStatusFilter: (status: EmployeeStatusFilter) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useEmployees(): UseEmployeesResult {
  const dispatch = useAppDispatch()
  const employees = useAppSelector(selectEmployees)
  const query = useAppSelector(selectEmployeeQuery)
  const hasNext = useAppSelector(selectEmployeeHasNext)
  const listStatus = useAppSelector(selectEmployeeListStatus)
  const listError = useAppSelector(selectEmployeeListError)
  const [searchInput, setSearchInput] = useState(query.searchTerm)

  useEffect(() => {
    dispatch(loadEmployees())
  }, [dispatch])

  useEffect(() => {
    const searchTerm = searchInput.trim()
    if (searchTerm === query.searchTerm) return
    const timer = window.setTimeout(() => dispatch(setEmployeeSearch(searchTerm)), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, searchInput, query.searchTerm])

  const setDepartmentFilter = useCallback((department: EmployeeDepartmentFilter) => { dispatch(setEmployeeDepartmentFilter(department)) }, [dispatch])
  const setStatusFilter = useCallback((status: EmployeeStatusFilter) => { dispatch(setEmployeeStatusFilter(status)) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setEmployeePage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setEmployeePageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadEmployees()) }, [dispatch])

  return {
    employees,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setDepartmentFilter,
    setStatusFilter,
    setPage,
    setPageSize,
    retry,
  }
}
