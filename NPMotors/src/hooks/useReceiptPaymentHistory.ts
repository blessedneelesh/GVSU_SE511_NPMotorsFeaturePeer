import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearPaymentHistory, loadPaymentHistory } from '../redux/receipts/receipts.actions'
import {
  selectReceiptPaymentHistoryError,
  selectReceiptPaymentHistoryInvoiceId,
  selectReceiptPaymentHistoryStatus,
  selectReceiptPayments,
} from '../redux/receipts/receipts.selectors'
import type { RequestStatus } from '../types/common'
import type { ReceiptPayment } from '../types/receipts'

export interface UseReceiptPaymentHistoryResult {
  payments: ReceiptPayment[]
  paymentHistoryStatus: RequestStatus
  paymentHistoryError: string | null
  retry: () => void
}

// Loads the payments of the given AR invoice whenever it changes, and forgets them when it's closed
export function useReceiptPaymentHistory(arInvoiceId: string | null): UseReceiptPaymentHistoryResult {
  const dispatch = useAppDispatch()
  const loadedInvoiceId = useAppSelector(selectReceiptPaymentHistoryInvoiceId)
  const payments = useAppSelector(selectReceiptPayments)
  const status = useAppSelector(selectReceiptPaymentHistoryStatus)
  const paymentHistoryError = useAppSelector(selectReceiptPaymentHistoryError)

  useEffect(() => {
    if (!arInvoiceId) return undefined
    dispatch(loadPaymentHistory(arInvoiceId))
    return () => { dispatch(clearPaymentHistory()) }
  }, [arInvoiceId, dispatch])

  const retry = useCallback(() => {
    if (arInvoiceId) dispatch(loadPaymentHistory(arInvoiceId))
  }, [arInvoiceId, dispatch])

  // Before this invoice's load starts, the slice may still hold nothing, or another invoice's payments
  const isCurrent = arInvoiceId !== null && loadedInvoiceId === arInvoiceId
  return {
    payments: isCurrent ? payments : [],
    paymentHistoryStatus: isCurrent ? status : 'idle',
    paymentHistoryError: isCurrent ? paymentHistoryError : null,
    retry,
  }
}
