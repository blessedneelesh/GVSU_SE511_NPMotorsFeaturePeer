import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearCustomerSalesInvoices, loadCustomerSalesInvoices } from '../redux/salesInvoices/salesInvoices.actions'
import {
  selectCustomerInvoices,
  selectCustomerInvoicesCustomerId,
  selectCustomerInvoicesError,
  selectCustomerInvoicesStatus,
} from '../redux/salesInvoices/salesInvoices.selectors'
import type { RequestStatus } from '../types/common'
import type { CustomerSalesInvoice } from '../types/salesInvoices'

export interface UseCustomerSalesInvoicesResult {
  invoices: CustomerSalesInvoice[]
  invoicesStatus: RequestStatus
  invoicesError: string | null
  retry: () => void
}

// Loads the given customer's sales invoices whenever it changes, and forgets them when the customer is closed
export function useCustomerSalesInvoices(customerId: string | null): UseCustomerSalesInvoicesResult {
  const dispatch = useAppDispatch()
  const loadedCustomerId = useAppSelector(selectCustomerInvoicesCustomerId)
  const invoices = useAppSelector(selectCustomerInvoices)
  const status = useAppSelector(selectCustomerInvoicesStatus)
  const invoicesError = useAppSelector(selectCustomerInvoicesError)

  useEffect(() => {
    if (!customerId) return undefined
    dispatch(loadCustomerSalesInvoices(customerId))
    return () => { dispatch(clearCustomerSalesInvoices()) }
  }, [customerId, dispatch])

  const retry = useCallback(() => {
    if (customerId) dispatch(loadCustomerSalesInvoices(customerId))
  }, [customerId, dispatch])

  // Before this customer's load starts, the slice may still hold nothing, or another customer's invoices
  const isCurrent = customerId !== null && loadedCustomerId === customerId
  return {
    invoices: isCurrent ? invoices : [],
    invoicesStatus: isCurrent ? status : 'idle',
    invoicesError: isCurrent ? invoicesError : null,
    retry,
  }
}
