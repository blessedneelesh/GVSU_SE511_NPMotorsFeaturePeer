import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadReceivableCustomerOptions } from '../redux/receivables/receivables.actions'
import {
  selectReceivableCustomerOptions,
  selectReceivableCustomerOptionsError,
  selectReceivableCustomerOptionsStatus,
} from '../redux/receivables/receivables.selectors'
import type { RequestStatus } from '../types/common'
import type { ReceivableCustomerOption } from '../types/receivables'

export interface UseReceivableCustomerOptionsResult {
  customerOptions: ReceivableCustomerOption[]
  customerOptionsStatus: RequestStatus
  customerOptionsError: string | null
  retry: () => void
}

// Loads the customers on mount, so the customer filter always shows the current list
export function useReceivableCustomerOptions(): UseReceivableCustomerOptionsResult {
  const dispatch = useAppDispatch()
  const customerOptions = useAppSelector(selectReceivableCustomerOptions)
  const customerOptionsStatus = useAppSelector(selectReceivableCustomerOptionsStatus)
  const customerOptionsError = useAppSelector(selectReceivableCustomerOptionsError)

  useEffect(() => {
    dispatch(loadReceivableCustomerOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadReceivableCustomerOptions()) }, [dispatch])

  return { customerOptions, customerOptionsStatus, customerOptionsError, retry }
}
