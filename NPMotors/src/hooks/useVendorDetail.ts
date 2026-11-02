import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearVendorSelection, selectVendor } from '../redux/vendors/vendors.actions'
import {
  selectSelectedVendor,
  selectSelectedVendorId,
  selectVendorDetailError,
  selectVendorDetailStatus,
} from '../redux/vendors/vendors.selectors'
import type { RequestStatus } from '../types/common'
import type { Vendor } from '../types/vendors'

export interface UseVendorDetailResult {
  selectedId: string | null
  vendor: Vendor | null
  detailStatus: RequestStatus
  detailError: string | null
  openVendor: (id: string) => void
  closeVendor: () => void
  retry: () => void
}

export function useVendorDetail(): UseVendorDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedVendorId)
  const vendor = useAppSelector(selectSelectedVendor)
  const detailStatus = useAppSelector(selectVendorDetailStatus)
  const detailError = useAppSelector(selectVendorDetailError)

  const openVendor = useCallback((id: string) => { dispatch(selectVendor(id)) }, [dispatch])
  const closeVendor = useCallback(() => { dispatch(clearVendorSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectVendor(selectedId)) }, [dispatch, selectedId])

  return { selectedId, vendor, detailStatus, detailError, openVendor, closeVendor, retry }
}
