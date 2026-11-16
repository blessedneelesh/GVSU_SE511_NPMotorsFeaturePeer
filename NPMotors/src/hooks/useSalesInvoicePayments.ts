import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearSalesInvoicePayments, loadSalesInvoicePayments } from '../redux/receipts/receipts.actions'
import {
  selectSalesInvoicePayments,
  selectSalesInvoicePaymentsError,
  selectSalesInvoicePaymentsId,
  selectSalesInvoicePaymentsStatus,
} from '../redux/receipts/receipts.selectors'
import type { RequestStatus } from '../types/common'
import type { ReceiptPayment, SalesInvoicePaymentsRequest } from '../types/receipts'

export interface UseSalesInvoicePaymentsResult {
  payments: ReceiptPayment[]
  paymentsStatus: RequestStatus
  paymentsError: string | null
  retry: () => void
}

// Loads the sales invoice's receipts on mount (pass null to skip, e.g. when nothing has been paid),
// and forgets them on unmount
export function useSalesInvoicePayments(request: SalesInvoicePaymentsRequest | null): UseSalesInvoicePaymentsResult {
  const dispatch = useAppDispatch()
  const loadedId = useAppSelector(selectSalesInvoicePaymentsId)
  const payments = useAppSelector(selectSalesInvoicePayments)
  const status = useAppSelector(selectSalesInvoicePaymentsStatus)
  const paymentsError = useAppSelector(selectSalesInvoicePaymentsError)

  // Depend on the fields, not the object, so a new object for the same invoice doesn't reload
  const salesInvoiceId = request?.salesInvoiceId ?? null
  const customerId = request?.customerId ?? ''
  const invoiceNumber = request?.invoiceNumber ?? ''

  const load = useCallback(() => {
    if (salesInvoiceId) dispatch(loadSalesInvoicePayments({ salesInvoiceId, customerId, invoiceNumber }))
  }, [customerId, dispatch, invoiceNumber, salesInvoiceId])

  useEffect(() => {
    if (!salesInvoiceId) return undefined
    load()
    return () => { dispatch(clearSalesInvoicePayments()) }
  }, [dispatch, load, salesInvoiceId])

  const isCurrent = salesInvoiceId !== null && loadedId === salesInvoiceId
  return {
    payments: isCurrent ? payments : [],
    paymentsStatus: isCurrent ? status : 'idle',
    paymentsError: isCurrent ? paymentsError : null,
    retry: load,
  }
}
