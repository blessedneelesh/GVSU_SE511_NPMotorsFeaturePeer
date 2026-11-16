import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearSalesInvoiceAr, findSalesInvoiceAr } from '../redux/receipts/receipts.actions'
import {
  selectArLookupArInvoiceId,
  selectArLookupError,
  selectArLookupSalesInvoiceId,
  selectArLookupStatus,
} from '../redux/receipts/receipts.selectors'
import type { RequestStatus } from '../types/common'
import type { SalesInvoicePaymentsRequest } from '../types/receipts'

export interface UseSalesInvoiceArLookupResult {
  // null until found, or when the sales invoice has no AR invoice
  arInvoiceId: string | null
  lookupStatus: RequestStatus
  lookupError: string | null
  retry: () => void
}

// Finds the sales invoice's AR invoice on mount, and forgets it on unmount
export function useSalesInvoiceArLookup({ salesInvoiceId, customerId, invoiceNumber }: SalesInvoicePaymentsRequest): UseSalesInvoiceArLookupResult {
  const dispatch = useAppDispatch()
  const lookupSalesInvoiceId = useAppSelector(selectArLookupSalesInvoiceId)
  const arInvoiceId = useAppSelector(selectArLookupArInvoiceId)
  const status = useAppSelector(selectArLookupStatus)
  const lookupError = useAppSelector(selectArLookupError)

  const find = useCallback(() => {
    dispatch(findSalesInvoiceAr({ salesInvoiceId, customerId, invoiceNumber }))
  }, [customerId, dispatch, invoiceNumber, salesInvoiceId])

  useEffect(() => {
    find()
    return () => { dispatch(clearSalesInvoiceAr()) }
  }, [dispatch, find])

  const isCurrent = lookupSalesInvoiceId === salesInvoiceId
  return {
    arInvoiceId: isCurrent ? arInvoiceId : null,
    lookupStatus: isCurrent ? status : 'idle',
    lookupError: isCurrent ? lookupError : null,
    retry: find,
  }
}
