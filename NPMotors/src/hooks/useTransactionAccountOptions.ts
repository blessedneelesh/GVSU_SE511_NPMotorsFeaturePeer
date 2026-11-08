import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadTransactionAccountOptions } from '../redux/transactions/transactions.actions'
import {
  selectTransactionAccountOptions,
  selectTransactionAccountOptionsError,
  selectTransactionAccountOptionsStatus,
} from '../redux/transactions/transactions.selectors'
import type { RequestStatus } from '../types/common'
import type { TransactionAccountOption } from '../types/transactions'

export interface UseTransactionAccountOptionsResult {
  accountOptions: TransactionAccountOption[]
  accountOptionsStatus: RequestStatus
  accountOptionsError: string | null
  retry: () => void
}

// Loads the bank accounts on mount, so the Bank Account filter always offers the current list
export function useTransactionAccountOptions(): UseTransactionAccountOptionsResult {
  const dispatch = useAppDispatch()
  const accountOptions = useAppSelector(selectTransactionAccountOptions)
  const accountOptionsStatus = useAppSelector(selectTransactionAccountOptionsStatus)
  const accountOptionsError = useAppSelector(selectTransactionAccountOptionsError)

  useEffect(() => {
    dispatch(loadTransactionAccountOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadTransactionAccountOptions()) }, [dispatch])

  return { accountOptions, accountOptionsStatus, accountOptionsError, retry }
}
