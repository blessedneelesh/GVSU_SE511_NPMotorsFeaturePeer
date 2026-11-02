import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadVehicleVendorOptions } from '../redux/vehicles/vehicles.actions'
import {
  selectVehicleVendorOptions,
  selectVehicleVendorOptionsError,
  selectVehicleVendorOptionsStatus,
} from '../redux/vehicles/vehicles.selectors'
import type { RequestStatus } from '../types/common'
import type { VehicleVendorOption } from '../types/vehicles'

export interface UseVehicleVendorOptionsResult {
  vendorOptions: VehicleVendorOption[]
  vendorOptionsStatus: RequestStatus
  vendorOptionsError: string | null
  retry: () => void
}

// Loads the vehicle vendors on mount, so the Add Vehicle form always offers the current list
export function useVehicleVendorOptions(): UseVehicleVendorOptionsResult {
  const dispatch = useAppDispatch()
  const vendorOptions = useAppSelector(selectVehicleVendorOptions)
  const vendorOptionsStatus = useAppSelector(selectVehicleVendorOptionsStatus)
  const vendorOptionsError = useAppSelector(selectVehicleVendorOptionsError)

  useEffect(() => {
    dispatch(loadVehicleVendorOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadVehicleVendorOptions()) }, [dispatch])

  return { vendorOptions, vendorOptionsStatus, vendorOptionsError, retry }
}
