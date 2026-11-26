import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearPayableSelection, selectPayable } from '../redux/payables/payables.actions'
import {
  selectPayableDetailError,
  selectPayableDetailStatus,
  selectSelectedPayable,
  selectSelectedPayableId,
} from '../redux/payables/payables.selectors'
import type { RequestStatus } from '../types/common'
import type { PayableDetail } from '../types/payables'

export interface UsePayableDetailResult {
  selectedId: string | null
  payable: PayableDetail | null
  detailStatus: RequestStatus
  detailError: string | null
  openPayable: (id: string) => void
  closePayable: () => void
  retry: () => void
}

export function usePayableDetail(): UsePayableDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedPayableId)
  const payable = useAppSelector(selectSelectedPayable)
  const detailStatus = useAppSelector(selectPayableDetailStatus)
  const detailError = useAppSelector(selectPayableDetailError)

  const openPayable = useCallback((id: string) => { dispatch(selectPayable(id)) }, [dispatch])
  const closePayable = useCallback(() => { dispatch(clearPayableSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectPayable(selectedId)) }, [dispatch, selectedId])

  return { selectedId, payable, detailStatus, detailError, openPayable, closePayable, retry }
}
