import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { createBankAccount, resetBankAccountSave } from '../redux/bankAccounts/bankAccounts.actions'
import {
  selectBankAccountFieldErrors,
  selectBankAccountSaveError,
  selectBankAccountSaveStatus,
} from '../redux/bankAccounts/bankAccounts.selectors'
import type { RequestStatus } from '../types/common'
import type { BankAccountFieldErrors, BankAccountFormValues } from '../types/bankAccounts'

export interface UseBankAccountMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: BankAccountFieldErrors
  create: (values: BankAccountFormValues) => void
  resetSave: () => void
}

export function useBankAccountMutations(): UseBankAccountMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectBankAccountSaveStatus)
  const saveError = useAppSelector(selectBankAccountSaveError)
  const fieldErrors = useAppSelector(selectBankAccountFieldErrors)

  const create = useCallback((values: BankAccountFormValues) => { dispatch(createBankAccount(values)) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetBankAccountSave()) }, [dispatch])

  return { saveStatus, saveError, fieldErrors, create, resetSave }
}
