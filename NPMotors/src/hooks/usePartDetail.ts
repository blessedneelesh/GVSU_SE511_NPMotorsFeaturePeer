import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearPartSelection, selectPart } from '../redux/parts/parts.actions'
import {
  selectPartDetailError,
  selectPartDetailStatus,
  selectSelectedPart,
  selectSelectedPartId,
} from '../redux/parts/parts.selectors'
import type { RequestStatus } from '../types/common'
import type { Part } from '../types/parts'

export interface UsePartDetailResult {
  selectedId: string | null
  part: Part | null
  detailStatus: RequestStatus
  detailError: string | null
  openPart: (id: string) => void
  closePart: () => void
  retry: () => void
}

export function usePartDetail(): UsePartDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedPartId)
  const part = useAppSelector(selectSelectedPart)
  const detailStatus = useAppSelector(selectPartDetailStatus)
  const detailError = useAppSelector(selectPartDetailError)

  const openPart = useCallback((id: string) => { dispatch(selectPart(id)) }, [dispatch])
  const closePart = useCallback(() => { dispatch(clearPartSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectPart(selectedId)) }, [dispatch, selectedId])

  return { selectedId, part, detailStatus, detailError, openPart, closePart, retry }
}
