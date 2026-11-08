import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadBankOptions } from '../redux/bankAccounts/bankAccounts.actions'
import {
  selectBankOptions,
  selectBankOptionsError,
  selectBankOptionsStatus,
} from '../redux/bankAccounts/bankAccounts.selectors'
import type { RequestStatus } from '../types/common'
import type { BankOption } from '../types/bankAccounts'

export interface UseBankOptionsResult {
  bankOptions: BankOption[]
  bankOptionsStatus: RequestStatus
  bankOptionsError: string | null
  retry: () => void
}

// Loads the banks on mount, so the bank filter and the Add Bank Account form always offer the current list
export function useBankOptions(): UseBankOptionsResult {
  const dispatch = useAppDispatch()
  const bankOptions = useAppSelector(selectBankOptions)
  const bankOptionsStatus = useAppSelector(selectBankOptionsStatus)
  const bankOptionsError = useAppSelector(selectBankOptionsError)

  useEffect(() => {
    dispatch(loadBankOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadBankOptions()) }, [dispatch])

  return { bankOptions, bankOptionsStatus, bankOptionsError, retry }
}
