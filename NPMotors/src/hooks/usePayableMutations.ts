import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { recordVendorPayment, resetPayableSave } from '../redux/payables/payables.actions'
import { selectPayableFieldErrors, selectPayableSaveError, selectPayableSaveStatus } from '../redux/payables/payables.selectors'
import type { RequestStatus } from '../types/common'
import type { VendorPaymentFieldErrors, VendorPaymentFormValues } from '../types/payables'

export interface UsePayableMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: VendorPaymentFieldErrors
  recordPayment: (apBillId: string, values: VendorPaymentFormValues) => void
  resetSave: () => void
}

export function usePayableMutations(): UsePayableMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectPayableSaveStatus)
  const saveError = useAppSelector(selectPayableSaveError)
  const fieldErrors = useAppSelector(selectPayableFieldErrors)

  const recordPayment = useCallback((apBillId: string, values: VendorPaymentFormValues) => { dispatch(recordVendorPayment({ apBillId, values })) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetPayableSave()) }, [dispatch])

  return { saveStatus, saveError, fieldErrors, recordPayment, resetSave }
}
