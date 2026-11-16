import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { recordArPayment, resetReceiptSave } from '../redux/receipts/receipts.actions'
import { selectReceiptFieldErrors, selectReceiptSaveError, selectReceiptSaveStatus } from '../redux/receipts/receipts.selectors'
import type { RequestStatus } from '../types/common'
import type { ReceiptFieldErrors, ReceiptFormValues } from '../types/receipts'

export interface UseReceiptMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: ReceiptFieldErrors
  recordPayment: (arInvoiceId: string, values: ReceiptFormValues) => void
  resetSave: () => void
}

export function useReceiptMutations(): UseReceiptMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectReceiptSaveStatus)
  const saveError = useAppSelector(selectReceiptSaveError)
  const fieldErrors = useAppSelector(selectReceiptFieldErrors)

  const recordPayment = useCallback((arInvoiceId: string, values: ReceiptFormValues) => { dispatch(recordArPayment({ arInvoiceId, values })) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetReceiptSave()) }, [dispatch])

  return { saveStatus, saveError, fieldErrors, recordPayment, resetSave }
}
