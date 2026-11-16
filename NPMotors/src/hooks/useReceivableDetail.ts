import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearReceivableSelection, selectReceivable } from '../redux/receivables/receivables.actions'
import {
  selectReceivableDetailError,
  selectReceivableDetailStatus,
  selectSelectedReceivable,
  selectSelectedReceivableId,
} from '../redux/receivables/receivables.selectors'
import type { RequestStatus } from '../types/common'
import type { ReceivableDetail } from '../types/receivables'

export interface UseReceivableDetailResult {
  selectedId: string | null
  receivable: ReceivableDetail | null
  detailStatus: RequestStatus
  detailError: string | null
  openReceivable: (id: string) => void
  closeReceivable: () => void
  retry: () => void
}

export function useReceivableDetail(): UseReceivableDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedReceivableId)
  const receivable = useAppSelector(selectSelectedReceivable)
  const detailStatus = useAppSelector(selectReceivableDetailStatus)
  const detailError = useAppSelector(selectReceivableDetailError)

  const openReceivable = useCallback((id: string) => { dispatch(selectReceivable(id)) }, [dispatch])
  const closeReceivable = useCallback(() => { dispatch(clearReceivableSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectReceivable(selectedId)) }, [dispatch, selectedId])

  return { selectedId, receivable, detailStatus, detailError, openReceivable, closeReceivable, retry }
}
