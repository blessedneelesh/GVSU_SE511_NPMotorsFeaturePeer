import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadPartVendorOptions } from '../redux/parts/parts.actions'
import {
  selectPartVendorOptions,
  selectPartVendorOptionsError,
  selectPartVendorOptionsStatus,
} from '../redux/parts/parts.selectors'
import type { RequestStatus } from '../types/common'
import type { PartVendorOption } from '../types/parts'

export interface UsePartVendorOptionsResult {
  vendorOptions: PartVendorOption[]
  vendorOptionsStatus: RequestStatus
  vendorOptionsError: string | null
  // Vendor name for a part's vendor_Id; "Vendor #id" until the vendors load or when the id is unknown
  vendorName: (vendorId: string) => string
  retry: () => void
}

// Loads the vendors on mount, so the Vendor column and the Receive Parts form always use the current list
export function usePartVendorOptions(): UsePartVendorOptionsResult {
  const dispatch = useAppDispatch()
  const vendorOptions = useAppSelector(selectPartVendorOptions)
  const vendorOptionsStatus = useAppSelector(selectPartVendorOptionsStatus)
  const vendorOptionsError = useAppSelector(selectPartVendorOptionsError)

  useEffect(() => {
    dispatch(loadPartVendorOptions())
  }, [dispatch])

  const vendorName = useCallback(
    (vendorId: string) => (vendorId ? vendorOptions.find((option) => option.id === vendorId)?.name ?? `Vendor #${vendorId}` : ''),
    [vendorOptions],
  )
  const retry = useCallback(() => { dispatch(loadPartVendorOptions()) }, [dispatch])

  return { vendorOptions, vendorOptionsStatus, vendorOptionsError, vendorName, retry }
}
