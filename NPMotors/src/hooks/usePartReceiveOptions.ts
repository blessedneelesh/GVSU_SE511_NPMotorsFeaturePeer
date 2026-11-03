import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadPartReceiveOptions } from '../redux/parts/parts.actions'
import {
  selectPartReceiveOptions,
  selectPartReceiveOptionsError,
  selectPartReceiveOptionsStatus,
} from '../redux/parts/parts.selectors'
import type { RequestStatus } from '../types/common'
import type { PartReceiveOptions } from '../types/parts'

export interface UsePartReceiveOptionsResult {
  receiveOptions: PartReceiveOptions
  receiveOptionsStatus: RequestStatus
  receiveOptionsError: string | null
  retry: () => void
}

// Loads every part and bank account on mount, so each opening of Receive Parts shows current stock and costs
export function usePartReceiveOptions(): UsePartReceiveOptionsResult {
  const dispatch = useAppDispatch()
  const receiveOptions = useAppSelector(selectPartReceiveOptions)
  const receiveOptionsStatus = useAppSelector(selectPartReceiveOptionsStatus)
  const receiveOptionsError = useAppSelector(selectPartReceiveOptionsError)

  useEffect(() => {
    dispatch(loadPartReceiveOptions())
  }, [dispatch])

  const retry = useCallback(() => { dispatch(loadPartReceiveOptions()) }, [dispatch])

  return { receiveOptions, receiveOptionsStatus, receiveOptionsError, retry }
}
