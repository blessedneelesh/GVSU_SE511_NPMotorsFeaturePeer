import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearEmployeeSelection, selectEmployee } from '../redux/employees/employees.actions'
import {
  selectEmployeeDetailError,
  selectEmployeeDetailStatus,
  selectSelectedEmployee,
  selectSelectedEmployeeId,
} from '../redux/employees/employees.selectors'
import type { RequestStatus } from '../types/common'
import type { Employee } from '../types/employees'

export interface UseEmployeeDetailResult {
  selectedId: string | null
  employee: Employee | null
  detailStatus: RequestStatus
  detailError: string | null
  openEmployee: (id: string) => void
  closeEmployee: () => void
  retry: () => void
}

export function useEmployeeDetail(): UseEmployeeDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedEmployeeId)
  const employee = useAppSelector(selectSelectedEmployee)
  const detailStatus = useAppSelector(selectEmployeeDetailStatus)
  const detailError = useAppSelector(selectEmployeeDetailError)

  const openEmployee = useCallback((id: string) => { dispatch(selectEmployee(id)) }, [dispatch])
  const closeEmployee = useCallback(() => { dispatch(clearEmployeeSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectEmployee(selectedId)) }, [dispatch, selectedId])

  return { selectedId, employee, detailStatus, detailError, openEmployee, closeEmployee, retry }
}
