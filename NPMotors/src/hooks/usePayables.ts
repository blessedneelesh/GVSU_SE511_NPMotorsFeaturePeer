import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadPayables,
  resetPayableFilters,
  setPayableAsOfDate,
  setPayablePage,
  setPayablePageSize,
  setPayableStatusFilter,
  setPayableVendorFilter,
} from '../redux/payables/payables.actions'
import {
  selectPayableHasNext,
  selectPayableListError,
  selectPayableListStatus,
  selectPayableQuery,
  selectPayables,
} from '../redux/payables/payables.selectors'
import type { RequestStatus } from '../types/common'
import type { Payable, PayableQuery, PayableStatusFilter, PayableVendorFilter } from '../types/payables'

// GetAllApBills has no SearchTerm, so unlike useCustomers there is no debounced search here
export interface UsePayablesResult {
  payables: Payable[]
  query: PayableQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  setStatusFilter: (status: PayableStatusFilter) => void
  setVendorFilter: (vendorId: PayableVendorFilter) => void
  setAsOfDate: (asOfDate: string) => void
  resetFilters: () => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function usePayables(): UsePayablesResult {
  const dispatch = useAppDispatch()
  const payables = useAppSelector(selectPayables)
  const query = useAppSelector(selectPayableQuery)
  const hasNext = useAppSelector(selectPayableHasNext)
  const listStatus = useAppSelector(selectPayableListStatus)
  const listError = useAppSelector(selectPayableListError)

  useEffect(() => {
    dispatch(loadPayables())
  }, [dispatch])

  const setStatusFilter = useCallback((status: PayableStatusFilter) => { dispatch(setPayableStatusFilter(status)) }, [dispatch])
  const setVendorFilter = useCallback((vendorId: PayableVendorFilter) => { dispatch(setPayableVendorFilter(vendorId)) }, [dispatch])
  const setAsOfDate = useCallback((asOfDate: string) => { dispatch(setPayableAsOfDate(asOfDate)) }, [dispatch])
  const resetFilters = useCallback(() => { dispatch(resetPayableFilters()) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setPayablePage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setPayablePageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadPayables()) }, [dispatch])

  return {
    payables,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    setStatusFilter,
    setVendorFilter,
    setAsOfDate,
    resetFilters,
    setPage,
    setPageSize,
    retry,
  }
}
