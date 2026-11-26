import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadPayableVendorOptions } from '../redux/payables/payables.actions'
import {
  selectPayableVendorOptions,
  selectPayableVendorOptionsError,
  selectPayableVendorOptionsStatus,
} from '../redux/payables/payables.selectors'
import type { RequestStatus } from '../types/common'
import type { PayableVendorOption } from '../types/payables'

export interface UsePayableVendorOptionsResult {
  vendorOptions: PayableVendorOption[]
  vendorOptionsStatus: RequestStatus
  vendorOptionsError: string | null
  retry: () => void
}

// Loads the vendors on mount, so the vendor filter always shows the current list
export function usePayableVendorOptions(): UsePayableVendorOptionsResult {
  const dispatch = useAppDispatch()
  const vendorOptions = useAppSelector(selectPayableVendorOptions)
  const vendorOptionsStatus = useAppSelector(selectPayableVendorOptionsStatus)
  const vendorOptionsError = useAppSelector(selectPayableVendorOptionsError)

  useEffect(() => {
    dispatch(loadPayableVendorOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadPayableVendorOptions()) }, [dispatch])

  return { vendorOptions, vendorOptionsStatus, vendorOptionsError, retry }
}
