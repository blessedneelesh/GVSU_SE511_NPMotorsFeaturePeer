import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearBankAccountSelection, selectBankAccount } from '../redux/bankAccounts/bankAccounts.actions'
import {
  selectBankAccountDetailError,
  selectBankAccountDetailStatus,
  selectSelectedBankAccount,
  selectSelectedBankAccountId,
} from '../redux/bankAccounts/bankAccounts.selectors'
import type { RequestStatus } from '../types/common'
import type { BankAccount } from '../types/bankAccounts'

export interface UseBankAccountDetailResult {
  selectedId: string | null
  bankAccount: BankAccount | null
  detailStatus: RequestStatus
  detailError: string | null
  openBankAccount: (id: string) => void
  closeBankAccount: () => void
  retry: () => void
}

export function useBankAccountDetail(): UseBankAccountDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedBankAccountId)
  const bankAccount = useAppSelector(selectSelectedBankAccount)
  const detailStatus = useAppSelector(selectBankAccountDetailStatus)
  const detailError = useAppSelector(selectBankAccountDetailError)

  const openBankAccount = useCallback((id: string) => { dispatch(selectBankAccount(id)) }, [dispatch])
  const closeBankAccount = useCallback(() => { dispatch(clearBankAccountSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectBankAccount(selectedId)) }, [dispatch, selectedId])

  return { selectedId, bankAccount, detailStatus, detailError, openBankAccount, closeBankAccount, retry }
}
