import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { createVehicle, resetVehicleSave } from '../redux/vehicles/vehicles.actions'
import {
  selectVehicleFieldErrors,
  selectVehicleSaveError,
  selectVehicleSaveStatus,
} from '../redux/vehicles/vehicles.selectors'
import type { RequestStatus } from '../types/common'
import type { VehicleFieldErrors, VehicleFormValues } from '../types/vehicles'

export interface UseVehicleMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: VehicleFieldErrors
  create: (values: VehicleFormValues) => void
  resetSave: () => void
}

export function useVehicleMutations(): UseVehicleMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectVehicleSaveStatus)
  const saveError = useAppSelector(selectVehicleSaveError)
  const fieldErrors = useAppSelector(selectVehicleFieldErrors)

  const create = useCallback((values: VehicleFormValues) => { dispatch(createVehicle(values)) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetVehicleSave()) }, [dispatch])

  return { saveStatus, saveError, fieldErrors, create, resetSave }
}
