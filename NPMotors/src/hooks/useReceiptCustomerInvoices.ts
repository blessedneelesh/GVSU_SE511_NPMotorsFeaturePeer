import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearReceiptCustomerInvoices, loadReceiptCustomerInvoices } from '../redux/receipts/receipts.actions'
import {
  selectReceiptCustomerInvoices,
  selectReceiptCustomerInvoicesCustomerId,
  selectReceiptCustomerInvoicesError,
  selectReceiptCustomerInvoicesStatus,
} from '../redux/receipts/receipts.selectors'
import type { RequestStatus } from '../types/common'
import type { Receivable } from '../types/receivables'

export interface UseReceiptCustomerInvoicesResult {
  // Only the given customer's invoices; empty while another customer's are still in the store
  invoices: Receivable[]
  invoicesStatus: RequestStatus
  invoicesError: string | null
  retry: () => void
}

// Loads the customer's open AR invoices whenever the customer changes ('' = none picked), and forgets them on unmount
export function useReceiptCustomerInvoices(customerId: string): UseReceiptCustomerInvoicesResult {
  const dispatch = useAppDispatch()
  const loadedCustomerId = useAppSelector(selectReceiptCustomerInvoicesCustomerId)
  const storedInvoices = useAppSelector(selectReceiptCustomerInvoices)
  const storedStatus = useAppSelector(selectReceiptCustomerInvoicesStatus)
  const storedError = useAppSelector(selectReceiptCustomerInvoicesError)

  useEffect(() => {
    dispatch(customerId ? loadReceiptCustomerInvoices(customerId) : clearReceiptCustomerInvoices())
  }, [dispatch, customerId])

  useEffect(() => () => { dispatch(clearReceiptCustomerInvoices()) }, [dispatch])

  const retry = useCallback(() => { if (customerId) dispatch(loadReceiptCustomerInvoices(customerId)) }, [dispatch, customerId])

  const isCurrent = !!customerId && loadedCustomerId === customerId
  return {
    invoices: isCurrent ? storedInvoices : [],
    invoicesStatus: isCurrent ? storedStatus : customerId ? 'loading' : 'idle',
    invoicesError: isCurrent ? storedError : null,
    retry,
  }
}
