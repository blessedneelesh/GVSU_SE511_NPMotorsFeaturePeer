import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { receiveParts, resetPartSave } from '../redux/parts/parts.actions'
import {
  selectPartReceivedLines,
  selectPartSaveError,
  selectPartSaveStatus,
} from '../redux/parts/parts.selectors'
import type { RequestStatus } from '../types/common'
import type { PartReceiveLine } from '../types/parts'

export interface UsePartMutationsResult {
  saveStatus: RequestStatus
  saveError: string | null
  receivedLines: PartReceiveLine[]
  receive: (lines: PartReceiveLine[]) => void
  resetSave: () => void
}

export function usePartMutations(): UsePartMutationsResult {
  const dispatch = useAppDispatch()
  const saveStatus = useAppSelector(selectPartSaveStatus)
  const saveError = useAppSelector(selectPartSaveError)
  const receivedLines = useAppSelector(selectPartReceivedLines)

  const receive = useCallback((lines: PartReceiveLine[]) => { dispatch(receiveParts(lines)) }, [dispatch])
  const resetSave = useCallback(() => { dispatch(resetPartSave()) }, [dispatch])

  return { saveStatus, saveError, receivedLines, receive, resetSave }
}
