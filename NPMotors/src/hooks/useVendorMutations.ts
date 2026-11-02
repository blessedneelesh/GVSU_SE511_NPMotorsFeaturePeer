import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { createVendor, resetVendorSave } from '../redux/vendors/vendors.actions'
import {
  selectVendorFieldErrors,
  selectVendorSaveError,
  selectVendorSaveStatus,
} from '../redux/vendors/vendors.selectors'
import type { RequestStatus } from '../types/common'
import type { VendorFieldErrors, VendorFormValues } from '../types/vendors'

export interface UseVendorMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: VendorFieldErrors
  create: (values: VendorFormValues) => void
  resetSave: () => void
}

export function useVendorMutations(): UseVendorMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectVendorSaveStatus)
  const saveError = useAppSelector(selectVendorSaveError)
  const fieldErrors = useAppSelector(selectVendorFieldErrors)

  const create = useCallback((values: VendorFormValues) => { dispatch(createVendor(values)) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetVendorSave()) }, [dispatch])

  return { saveStatus, saveError, fieldErrors, create, resetSave }
}
