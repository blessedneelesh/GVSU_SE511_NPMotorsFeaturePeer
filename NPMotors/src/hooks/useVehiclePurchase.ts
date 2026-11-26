import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { purchaseVehicle, resetVehiclePurchase } from '../redux/vehicles/vehicles.actions'
import {
  selectVehiclePurchaseError,
  selectVehiclePurchaseFieldErrors,
  selectVehiclePurchaseResult,
  selectVehiclePurchaseStatus,
} from '../redux/vehicles/vehicles.selectors'
import type { RequestStatus } from '../types/common'
import type { VehiclePurchaseFieldErrors, VehiclePurchaseFormValues, VehiclePurchaseResult } from '../types/vehicles'

export interface UseVehiclePurchaseResult {
  purchaseStatus: RequestStatus
  purchaseError: string | null
  purchaseFieldErrors: VehiclePurchaseFieldErrors
  purchaseResult: VehiclePurchaseResult | null
  purchase: (values: VehiclePurchaseFormValues) => void
  resetPurchase: () => void
}

export function useVehiclePurchase(): UseVehiclePurchaseResult {
  const dispatch = useAppDispatch()
  const purchaseStatus = useAppSelector(selectVehiclePurchaseStatus)
  const purchaseError = useAppSelector(selectVehiclePurchaseError)
  const purchaseFieldErrors = useAppSelector(selectVehiclePurchaseFieldErrors)
  const purchaseResult = useAppSelector(selectVehiclePurchaseResult)

  const purchase = useCallback((values: VehiclePurchaseFormValues) => { dispatch(purchaseVehicle(values)) }, [dispatch])
  const resetPurchase = useCallback(() => { dispatch(resetVehiclePurchase()) }, [dispatch])

  return { purchaseStatus, purchaseError, purchaseFieldErrors, purchaseResult, purchase, resetPurchase }
}
