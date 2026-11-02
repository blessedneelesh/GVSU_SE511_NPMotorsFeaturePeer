import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { createEmployee, resetEmployeeSave } from '../redux/employees/employees.actions'
import {
  selectEmployeeFieldErrors,
  selectEmployeeSaveError,
  selectEmployeeSaveStatus,
} from '../redux/employees/employees.selectors'
import type { RequestStatus } from '../types/common'
import type { EmployeeFieldErrors, EmployeeFormValues } from '../types/employees'

export interface UseEmployeeMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: EmployeeFieldErrors
  create: (values: EmployeeFormValues) => void
  resetSave: () => void
}

export function useEmployeeMutations(): UseEmployeeMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectEmployeeSaveStatus)
  const saveError = useAppSelector(selectEmployeeSaveError)
  const fieldErrors = useAppSelector(selectEmployeeFieldErrors)

  const create = useCallback((values: EmployeeFormValues) => { dispatch(createEmployee(values)) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetEmployeeSave()) }, [dispatch])

  return { saveStatus, saveError, fieldErrors, create, resetSave }
}
