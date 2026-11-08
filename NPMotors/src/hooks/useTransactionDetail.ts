import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearTransactionSelection, selectTransaction } from '../redux/transactions/transactions.actions'
import {
  selectSelectedTransaction,
  selectSelectedTransactionId,
  selectTransactionDetailError,
  selectTransactionDetailStatus,
} from '../redux/transactions/transactions.selectors'
import type { RequestStatus } from '../types/common'
import type { Transaction } from '../types/transactions'

export interface UseTransactionDetailResult {
  selectedId: string | null
  transaction: Transaction | null
  detailStatus: RequestStatus
  detailError: string | null
  openTransaction: (id: string) => void
  closeTransaction: () => void
  retry: () => void
}

export function useTransactionDetail(): UseTransactionDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedTransactionId)
  const transaction = useAppSelector(selectSelectedTransaction)
  const detailStatus = useAppSelector(selectTransactionDetailStatus)
  const detailError = useAppSelector(selectTransactionDetailError)

  const openTransaction = useCallback((id: string) => { dispatch(selectTransaction(id)) }, [dispatch])
  const closeTransaction = useCallback(() => { dispatch(clearTransactionSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectTransaction(selectedId)) }, [dispatch, selectedId])

  return { selectedId, transaction, detailStatus, detailError, openTransaction, closeTransaction, retry }
}
