import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  cancelSalesInvoice,
  createSalesInvoice,
  postSalesInvoice,
  postSalesInvoiceDraft,
  resetSalesInvoiceCancel,
  resetSalesInvoiceSave,
  updateSalesInvoiceDraft,
} from '../redux/salesInvoices/salesInvoices.actions'
import {
  selectSalesInvoiceCancelError,
  selectSalesInvoiceCancelStatus,
  selectSalesInvoiceFieldErrors,
  selectSalesInvoiceSaveError,
  selectSalesInvoiceSaveMode,
  selectSalesInvoiceSaveStatus,
} from '../redux/salesInvoices/salesInvoices.selectors'
import type { RequestStatus } from '../types/common'
import type { SalesInvoiceFieldErrors, SalesInvoiceFormValues, SalesInvoiceSaveMode } from '../types/salesInvoices'

export interface UseSalesInvoiceMutationsResult {
  saveMode: SalesInvoiceSaveMode | null
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: SalesInvoiceFieldErrors
  cancelStatus: RequestStatus
  cancelError: string | null
  saveDraft: (values: SalesInvoiceFormValues) => void
  post: (values: SalesInvoiceFormValues) => void
  // An existing draft: save its changes, or save them and post it
  updateDraft: (id: string, values: SalesInvoiceFormValues) => void
  postDraft: (id: string, values: SalesInvoiceFormValues) => void
  cancel: (id: string, reason: string) => void
  resetSave: () => void
  resetCancel: () => void
}

export function useSalesInvoiceMutations(): UseSalesInvoiceMutationsResult {
  const dispatch = useAppDispatch()
  const saveMode = useAppSelector(selectSalesInvoiceSaveMode)
  const saveStatus = useAppSelector(selectSalesInvoiceSaveStatus)
  const saveError = useAppSelector(selectSalesInvoiceSaveError)
  const fieldErrors = useAppSelector(selectSalesInvoiceFieldErrors)
  const cancelStatus = useAppSelector(selectSalesInvoiceCancelStatus)
  const cancelError = useAppSelector(selectSalesInvoiceCancelError)

  const saveDraft = useCallback((values: SalesInvoiceFormValues) => { dispatch(createSalesInvoice(values)) }, [dispatch])
  const post = useCallback((values: SalesInvoiceFormValues) => { dispatch(postSalesInvoice(values)) }, [dispatch])
  const updateDraft = useCallback((id: string, values: SalesInvoiceFormValues) => { dispatch(updateSalesInvoiceDraft({ id, values })) }, [dispatch])
  const postDraft = useCallback((id: string, values: SalesInvoiceFormValues) => { dispatch(postSalesInvoiceDraft({ id, values })) }, [dispatch])
  const cancel = useCallback((id: string, reason: string) => { dispatch(cancelSalesInvoice({ id, reason })) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetSalesInvoiceSave()) }, [dispatch])
  const resetCancel = useCallback(() => { dispatch(resetSalesInvoiceCancel()) }, [dispatch])

  return {
    saveMode,
    saveStatus,
    saveError,
    fieldErrors,
    cancelStatus,
    cancelError,
    saveDraft,
    post,
    updateDraft,
    postDraft,
    cancel,
    resetSave,
    resetCancel,
  }
}
