import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearPaymentVendorBills, loadPaymentVendorBills } from '../redux/payables/payables.actions'
import {
  selectPaymentVendorBills,
  selectPaymentVendorBillsError,
  selectPaymentVendorBillsStatus,
  selectPaymentVendorBillsVendorId,
} from '../redux/payables/payables.selectors'
import type { RequestStatus } from '../types/common'
import type { Payable } from '../types/payables'

export interface UsePaymentVendorBillsResult {
  // Only the given vendor's bills; empty while another vendor's are still in the store
  bills: Payable[]
  billsStatus: RequestStatus
  billsError: string | null
  retry: () => void
}

// Loads the vendor's open AP bills whenever the vendor changes ('' = none picked), and forgets them on unmount
export function usePaymentVendorBills(vendorId: string): UsePaymentVendorBillsResult {
  const dispatch = useAppDispatch()
  const loadedVendorId = useAppSelector(selectPaymentVendorBillsVendorId)
  const storedBills = useAppSelector(selectPaymentVendorBills)
  const storedStatus = useAppSelector(selectPaymentVendorBillsStatus)
  const storedError = useAppSelector(selectPaymentVendorBillsError)

  useEffect(() => {
    dispatch(vendorId ? loadPaymentVendorBills(vendorId) : clearPaymentVendorBills())
  }, [dispatch, vendorId])

  useEffect(() => () => { dispatch(clearPaymentVendorBills()) }, [dispatch])

  const retry = useCallback(() => { if (vendorId) dispatch(loadPaymentVendorBills(vendorId)) }, [dispatch, vendorId])

  const isCurrent = !!vendorId && loadedVendorId === vendorId
  return {
    bills: isCurrent ? storedBills : [],
    billsStatus: isCurrent ? storedStatus : vendorId ? 'loading' : 'idle',
    billsError: isCurrent ? storedError : null,
    retry,
  }
}
