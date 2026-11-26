import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearPayablePaymentHistory, loadPayablePaymentHistory } from '../redux/payables/payables.actions'
import {
  selectPayablePaymentHistoryBillId,
  selectPayablePaymentHistoryError,
  selectPayablePaymentHistoryStatus,
  selectPayablePayments,
} from '../redux/payables/payables.selectors'
import type { RequestStatus } from '../types/common'
import type { PayablePayment } from '../types/payables'

export interface UsePayablePaymentHistoryResult {
  payments: PayablePayment[]
  paymentHistoryStatus: RequestStatus
  paymentHistoryError: string | null
  retry: () => void
}

// Loads the payments of the given bill whenever it changes, and forgets them when it's closed
export function usePayablePaymentHistory(apBillId: string | null): UsePayablePaymentHistoryResult {
  const dispatch = useAppDispatch()
  const loadedBillId = useAppSelector(selectPayablePaymentHistoryBillId)
  const payments = useAppSelector(selectPayablePayments)
  const status = useAppSelector(selectPayablePaymentHistoryStatus)
  const paymentHistoryError = useAppSelector(selectPayablePaymentHistoryError)

  useEffect(() => {
    if (!apBillId) return undefined
    dispatch(loadPayablePaymentHistory(apBillId))
    return () => { dispatch(clearPayablePaymentHistory()) }
  }, [apBillId, dispatch])

  const retry = useCallback(() => {
    if (apBillId) dispatch(loadPayablePaymentHistory(apBillId))
  }, [apBillId, dispatch])

  // Before this bill's load starts, the slice may still hold nothing, or another bill's payments
  const isCurrent = apBillId !== null && loadedBillId === apBillId
  return {
    payments: isCurrent ? payments : [],
    paymentHistoryStatus: isCurrent ? status : 'idle',
    paymentHistoryError: isCurrent ? paymentHistoryError : null,
    retry,
  }
}
