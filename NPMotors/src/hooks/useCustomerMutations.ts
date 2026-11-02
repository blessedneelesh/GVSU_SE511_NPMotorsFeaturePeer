import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { createCustomer, resetCustomerSave } from '../redux/customers/customers.actions'
import {
  selectCustomerFieldErrors,
  selectCustomerSaveError,
  selectCustomerSaveStatus,
} from '../redux/customers/customers.selectors'
import type { RequestStatus } from '../types/common'
import type { CustomerFieldErrors, CustomerFormValues } from '../types/customers'

export interface UseCustomerMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: CustomerFieldErrors
  create: (values: CustomerFormValues) => void
  resetSave: () => void
}

export function useCustomerMutations(): UseCustomerMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectCustomerSaveStatus)
  const saveError = useAppSelector(selectCustomerSaveError)
  const fieldErrors = useAppSelector(selectCustomerFieldErrors)

  const create = useCallback((values: CustomerFormValues) => { dispatch(createCustomer(values)) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetCustomerSave()) }, [dispatch])

  return { saveStatus, saveError, fieldErrors, create, resetSave }
}
