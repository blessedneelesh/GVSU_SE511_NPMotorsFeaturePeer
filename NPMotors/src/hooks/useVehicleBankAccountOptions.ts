import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadVehicleBankAccountOptions } from '../redux/vehicles/vehicles.actions'
import {
  selectVehicleBankAccountOptions,
  selectVehicleBankAccountOptionsError,
  selectVehicleBankAccountOptionsStatus,
} from '../redux/vehicles/vehicles.selectors'
import type { RequestStatus } from '../types/common'
import type { VehicleBankAccountOption } from '../types/vehicles'

export interface UseVehicleBankAccountOptionsResult {
  bankAccountOptions: VehicleBankAccountOption[]
  bankAccountOptionsStatus: RequestStatus
  bankAccountOptionsError: string | null
  retry: () => void
}

// Loads the active bank accounts on mount, so the Purchase Vehicle payment step shows current balances
export function useVehicleBankAccountOptions(): UseVehicleBankAccountOptionsResult {
  const dispatch = useAppDispatch()
  const bankAccountOptions = useAppSelector(selectVehicleBankAccountOptions)
  const bankAccountOptionsStatus = useAppSelector(selectVehicleBankAccountOptionsStatus)
  const bankAccountOptionsError = useAppSelector(selectVehicleBankAccountOptionsError)

  useEffect(() => {
    dispatch(loadVehicleBankAccountOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadVehicleBankAccountOptions()) }, [dispatch])

  return { bankAccountOptions, bankAccountOptionsStatus, bankAccountOptionsError, retry }
}
