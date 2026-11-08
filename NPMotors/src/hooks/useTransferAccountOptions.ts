import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadTransferAccountOptions } from '../redux/transfers/transfers.actions'
import {
  selectTransferAccountOptions,
  selectTransferAccountOptionsError,
  selectTransferAccountOptionsStatus,
} from '../redux/transfers/transfers.selectors'
import type { RequestStatus } from '../types/common'
import type { TransferAccountOption } from '../types/transfers'

export interface UseTransferAccountOptionsResult {
  accountOptions: TransferAccountOption[]
  accountOptionsStatus: RequestStatus
  accountOptionsError: string | null
  retry: () => void
}

// Loads the accounts on mount, so the From/To lists and balances are always current
export function useTransferAccountOptions(): UseTransferAccountOptionsResult {
  const dispatch = useAppDispatch()
  const accountOptions = useAppSelector(selectTransferAccountOptions)
  const accountOptionsStatus = useAppSelector(selectTransferAccountOptionsStatus)
  const accountOptionsError = useAppSelector(selectTransferAccountOptionsError)

  useEffect(() => {
    dispatch(loadTransferAccountOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadTransferAccountOptions()) }, [dispatch])

  return { accountOptions, accountOptionsStatus, accountOptionsError, retry }
}
