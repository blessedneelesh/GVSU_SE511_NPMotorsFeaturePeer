import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadStatementLineAccountOptions } from '../redux/statementLines/statementLines.actions'
import {
  selectStatementLineAccountOptions,
  selectStatementLineAccountOptionsError,
  selectStatementLineAccountOptionsStatus,
} from '../redux/statementLines/statementLines.selectors'
import type { RequestStatus } from '../types/common'
import type { StatementLineAccountOption } from '../types/statementLines'

export interface UseStatementLineAccountOptionsResult {
  accountOptions: StatementLineAccountOption[]
  accountOptionsStatus: RequestStatus
  accountOptionsError: string | null
  retry: () => void
}

// Loads the bank accounts on mount, so the account tabs always show the current list
export function useStatementLineAccountOptions(): UseStatementLineAccountOptionsResult {
  const dispatch = useAppDispatch()
  const accountOptions = useAppSelector(selectStatementLineAccountOptions)
  const accountOptionsStatus = useAppSelector(selectStatementLineAccountOptionsStatus)
  const accountOptionsError = useAppSelector(selectStatementLineAccountOptionsError)

  useEffect(() => {
    dispatch(loadStatementLineAccountOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadStatementLineAccountOptions()) }, [dispatch])

  return { accountOptions, accountOptionsStatus, accountOptionsError, retry }
}
