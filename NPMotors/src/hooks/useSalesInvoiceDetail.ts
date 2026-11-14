import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearSalesInvoiceSelection, selectSalesInvoice } from '../redux/salesInvoices/salesInvoices.actions'
import {
  selectSalesInvoiceDetailError,
  selectSalesInvoiceDetailStatus,
  selectSelectedSalesInvoice,
  selectSelectedSalesInvoiceId,
  selectSelectedSalesInvoiceVehicle,
} from '../redux/salesInvoices/salesInvoices.selectors'
import type { RequestStatus } from '../types/common'
import type { SalesInvoice } from '../types/salesInvoices'
import type { Vehicle } from '../types/vehicles'

export interface UseSalesInvoiceDetailResult {
  selectedId: string | null
  salesInvoice: SalesInvoice | null
  // The invoice's vehicle record; null while it loads or when it couldn't be loaded
  vehicle: Vehicle | null
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
  const vehicle = useAppSelector(selectSelectedSalesInvoiceVehicle)
  const detailStatus = useAppSelector(selectSalesInvoiceDetailStatus)
  const detailError = useAppSelector(selectSalesInvoiceDetailError)

  const openSalesInvoice = useCallback((id: string) => { dispatch(selectSalesInvoice(id)) }, [dispatch])
  const closeSalesInvoice = useCallback(() => { dispatch(clearSalesInvoiceSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectSalesInvoice(selectedId)) }, [dispatch, selectedId])

  return { selectedId, salesInvoice, vehicle, detailStatus, detailError, openSalesInvoice, closeSalesInvoice, retry }
}
