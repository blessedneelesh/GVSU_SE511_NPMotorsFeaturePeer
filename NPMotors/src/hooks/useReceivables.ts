import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadReceivables,
  resetReceivableFilters,
  setReceivableAsOfDate,
  setReceivableCustomerFilter,
  setReceivablePage,
  setReceivablePageSize,
  setReceivableStatusFilter,
} from '../redux/receivables/receivables.actions'
import {
  selectReceivableHasNext,
  selectReceivableListError,
  selectReceivableListStatus,
  selectReceivableQuery,
  selectReceivables,
} from '../redux/receivables/receivables.selectors'
import type { RequestStatus } from '../types/common'
import type { Receivable, ReceivableCustomerFilter, ReceivableQuery, ReceivableStatusFilter } from '../types/receivables'

// GetAllAr has no SearchTerm, so unlike useCustomers there is no debounced search here
export interface UseReceivablesResult {
  receivables: Receivable[]
  query: ReceivableQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  setStatusFilter: (status: ReceivableStatusFilter) => void
  setCustomerFilter: (customerId: ReceivableCustomerFilter) => void
  setAsOfDate: (asOfDate: string) => void
  resetFilters: () => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useReceivables(): UseReceivablesResult {
  const dispatch = useAppDispatch()
  const receivables = useAppSelector(selectReceivables)
  const query = useAppSelector(selectReceivableQuery)
  const hasNext = useAppSelector(selectReceivableHasNext)
  const listStatus = useAppSelector(selectReceivableListStatus)
  const listError = useAppSelector(selectReceivableListError)

  useEffect(() => {
    dispatch(loadReceivables())
  }, [dispatch])

  const setStatusFilter = useCallback((status: ReceivableStatusFilter) => { dispatch(setReceivableStatusFilter(status)) }, [dispatch])
  const setCustomerFilter = useCallback((customerId: ReceivableCustomerFilter) => { dispatch(setReceivableCustomerFilter(customerId)) }, [dispatch])
  const setAsOfDate = useCallback((asOfDate: string) => { dispatch(setReceivableAsOfDate(asOfDate)) }, [dispatch])
  const resetFilters = useCallback(() => { dispatch(resetReceivableFilters()) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setReceivablePage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setReceivablePageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadReceivables()) }, [dispatch])

  return {
    receivables,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    setStatusFilter,
    setCustomerFilter,
    setAsOfDate,
    resetFilters,
    setPage,
    setPageSize,
    retry,
  }
}
