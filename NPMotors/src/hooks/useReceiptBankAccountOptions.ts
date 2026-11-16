import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadReceiptBankAccountOptions } from '../redux/receipts/receipts.actions'
import {
  selectReceiptBankAccountOptions,
  selectReceiptBankAccountOptionsError,
  selectReceiptBankAccountOptionsStatus,
} from '../redux/receipts/receipts.selectors'
import type { RequestStatus } from '../types/common'
import type { ReceiptBankAccountOption } from '../types/receipts'

export interface UseReceiptBankAccountOptionsResult {
  bankAccountOptions: ReceiptBankAccountOption[]
  bankAccountOptionsStatus: RequestStatus
  bankAccountOptionsError: string | null
  retry: () => void
}

// Loads the accounts on mount, so the Deposit To list is current each time the payment dialog opens
export function useReceiptBankAccountOptions(): UseReceiptBankAccountOptionsResult {
  const dispatch = useAppDispatch()
  const bankAccountOptions = useAppSelector(selectReceiptBankAccountOptions)
  const bankAccountOptionsStatus = useAppSelector(selectReceiptBankAccountOptionsStatus)
  const bankAccountOptionsError = useAppSelector(selectReceiptBankAccountOptionsError)

  useEffect(() => {
    dispatch(loadReceiptBankAccountOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadReceiptBankAccountOptions()) }, [dispatch])

  return { bankAccountOptions, bankAccountOptionsStatus, bankAccountOptionsError, retry }
}
