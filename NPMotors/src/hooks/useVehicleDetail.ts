import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearVehicleSelection, selectVehicle } from '../redux/vehicles/vehicles.actions'
import {
  selectSelectedVehicle,
  selectSelectedVehicleId,
  selectVehicleDetailError,
  selectVehicleDetailStatus,
} from '../redux/vehicles/vehicles.selectors'
import type { RequestStatus } from '../types/common'
import type { Vehicle } from '../types/vehicles'

export interface UseVehicleDetailResult {
  selectedId: string | null
  vehicle: Vehicle | null
  detailStatus: RequestStatus
  detailError: string | null
  openVehicle: (id: string) => void
  closeVehicle: () => void
  retry: () => void
}

export function useVehicleDetail(): UseVehicleDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedVehicleId)
  const vehicle = useAppSelector(selectSelectedVehicle)
  const detailStatus = useAppSelector(selectVehicleDetailStatus)
  const detailError = useAppSelector(selectVehicleDetailError)

  const openVehicle = useCallback((id: string) => { dispatch(selectVehicle(id)) }, [dispatch])
  const closeVehicle = useCallback(() => { dispatch(clearVehicleSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectVehicle(selectedId)) }, [dispatch, selectedId])

  return { selectedId, vehicle, detailStatus, detailError, openVehicle, closeVehicle, retry }
}
