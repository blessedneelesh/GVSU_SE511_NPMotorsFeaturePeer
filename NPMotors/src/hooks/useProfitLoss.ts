import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadProfitLoss, setProfitLossAnchorMonth, setProfitLossPeriodType } from '../redux/profitLoss/profitLoss.actions'
import {
  selectProfitLossComparison,
  selectProfitLossError,
  selectProfitLossQuery,
  selectProfitLossStatus,
} from '../redux/profitLoss/profitLoss.selectors'
import type { RequestStatus } from '../types/common'
import type { PeriodComparison, ReportPeriodType, ReportQuery } from '../types/reports'

export interface UseProfitLossResult {
  comparison: PeriodComparison | null
  query: ReportQuery
  status: RequestStatus
  error: string | null
  setPeriodType: (periodType: ReportPeriodType) => void
  setAnchorMonth: (anchorMonth: string) => void
  retry: () => void
}

export function useProfitLoss(): UseProfitLossResult {
  const dispatch = useAppDispatch()
  const comparison = useAppSelector(selectProfitLossComparison)
  const query = useAppSelector(selectProfitLossQuery)
  const status = useAppSelector(selectProfitLossStatus)
  const error = useAppSelector(selectProfitLossError)

  useEffect(() => {
    dispatch(loadProfitLoss())
  }, [dispatch])

  const setPeriodType = useCallback((periodType: ReportPeriodType) => { dispatch(setProfitLossPeriodType(periodType)) }, [dispatch])
  const setAnchorMonth = useCallback((anchorMonth: string) => { dispatch(setProfitLossAnchorMonth(anchorMonth)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadProfitLoss()) }, [dispatch])

  return { comparison, query, status, error, setPeriodType, setAnchorMonth, retry }
}
