import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadDashboard, setDashboardMonth } from '../redux/dashboard/dashboard.actions'
import {
  selectDashboardError,
  selectDashboardQuery,
  selectDashboardStatus,
  selectDashboardSummary,
} from '../redux/dashboard/dashboard.selectors'
import type { RequestStatus } from '../types/common'
import type { DashboardQuery, DashboardSummary } from '../types/dashboard'

export interface UseDashboardResult {
  summary: DashboardSummary | null
  query: DashboardQuery
  status: RequestStatus
  error: string | null
  setMonth: (month: string) => void
  retry: () => void
}

export function useDashboard(): UseDashboardResult {
  const dispatch = useAppDispatch()
  const summary = useAppSelector(selectDashboardSummary)
  const query = useAppSelector(selectDashboardQuery)
  const status = useAppSelector(selectDashboardStatus)
  const error = useAppSelector(selectDashboardError)

  useEffect(() => {
    dispatch(loadDashboard())
  }, [dispatch])

  const setMonth = useCallback((month: string) => { dispatch(setDashboardMonth(month)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadDashboard()) }, [dispatch])

  return { summary, query, status, error, setMonth, retry }
}
