import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearSalesInvoiceSelection, selectSalesInvoice } from '../redux/salesInvoices/salesInvoices.actions'
import {
  selectSalesInvoiceDetailError,
  selectSalesInvoiceDetailStatus,
  selectSelectedSalesInvoice,
  selectSelectedSalesInvoiceId,
} from '../redux/salesInvoices/salesInvoices.selectors'
import type { RequestStatus } from '../types/common'
import type { SalesInvoice } from '../types/salesInvoices'

export interface UseSalesInvoiceDetailResult {
  selectedId: string | null
  salesInvoice: SalesInvoice | null
  detailStatus: RequestStatus
  detailError: string | null
  openSalesInvoice: (id: string) => void
  closeSalesInvoice: () => void
  retry: () => void
}

export function useSalesInvoiceDetail(): UseSalesInvoiceDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedSalesInvoiceId)
  const salesInvoice = useAppSelector(selectSelectedSalesInvoice)
  const detailStatus = useAppSelector(selectSalesInvoiceDetailStatus)
  const detailError = useAppSelector(selectSalesInvoiceDetailError)

  const openSalesInvoice = useCallback((id: string) => { dispatch(selectSalesInvoice(id)) }, [dispatch])
  const closeSalesInvoice = useCallback(() => { dispatch(clearSalesInvoiceSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectSalesInvoice(selectedId)) }, [dispatch, selectedId])

  return { selectedId, salesInvoice, detailStatus, detailError, openSalesInvoice, closeSalesInvoice, retry }
}
