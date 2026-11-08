import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { createTransfer, resetTransferSave } from '../redux/transfers/transfers.actions'
import { selectTransferFieldErrors, selectTransferSaveError, selectTransferSaveStatus } from '../redux/transfers/transfers.selectors'
import type { RequestStatus } from '../types/common'
import type { TransferFieldErrors, TransferFormValues } from '../types/transfers'

export interface UseTransferMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: TransferFieldErrors
  create: (values: TransferFormValues) => void
  resetSave: () => void
}

export function useTransferMutations(): UseTransferMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectTransferSaveStatus)
  const saveError = useAppSelector(selectTransferSaveError)
  const fieldErrors = useAppSelector(selectTransferFieldErrors)

  const create = useCallback((values: TransferFormValues) => { dispatch(createTransfer(values)) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetTransferSave()) }, [dispatch])

  return { saveStatus, saveError, fieldErrors, create, resetSave }
}
