import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadStatementLines,
  resetStatementLineFilters,
  setStatementLineBankAccountFilter,
  setStatementLineMonthFilter,
  setStatementLinePage,
  setStatementLinePageSize,
  setStatementLineTypeFilter,
} from '../redux/statementLines/statementLines.actions'
import {
  selectStatementLineHasNext,
  selectStatementLineListError,
  selectStatementLineListStatus,
  selectStatementLineQuery,
  selectStatementLines,
} from '../redux/statementLines/statementLines.selectors'
import type { RequestStatus } from '../types/common'
import type {
  StatementLine,
  StatementLineBankAccountFilter,
  StatementLineQuery,
  StatementLineTypeFilter,
} from '../types/statementLines'

// GetStatementLines has no SearchTerm, so unlike useCustomers there is no debounced search here
export interface UseStatementLinesResult {
  statementLines: StatementLine[]
  query: StatementLineQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  setBankAccountFilter: (bankAccountId: StatementLineBankAccountFilter) => void
  setMonthFilter: (month: string) => void
  setTypeFilter: (type: StatementLineTypeFilter) => void
  resetFilters: () => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useStatementLines(): UseStatementLinesResult {
  const dispatch = useAppDispatch()
  const statementLines = useAppSelector(selectStatementLines)
  const query = useAppSelector(selectStatementLineQuery)
  const hasNext = useAppSelector(selectStatementLineHasNext)
  const listStatus = useAppSelector(selectStatementLineListStatus)
  const listError = useAppSelector(selectStatementLineListError)

  useEffect(() => {
    dispatch(loadStatementLines())
  }, [dispatch])

  const setBankAccountFilter = useCallback((bankAccountId: StatementLineBankAccountFilter) => { dispatch(setStatementLineBankAccountFilter(bankAccountId)) }, [dispatch])
  const setMonthFilter = useCallback((month: string) => { dispatch(setStatementLineMonthFilter(month)) }, [dispatch])
  const setTypeFilter = useCallback((type: StatementLineTypeFilter) => { dispatch(setStatementLineTypeFilter(type)) }, [dispatch])
  const resetFilters = useCallback(() => { dispatch(resetStatementLineFilters()) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setStatementLinePage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setStatementLinePageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadStatementLines()) }, [dispatch])

  return {
    statementLines,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    setBankAccountFilter,
    setMonthFilter,
    setTypeFilter,
    resetFilters,
    setPage,
    setPageSize,
    retry,
  }
}
