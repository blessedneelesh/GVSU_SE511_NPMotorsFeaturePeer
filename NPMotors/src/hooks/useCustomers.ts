import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadCustomers,
  setCustomerPage,
  setCustomerPageSize,
  setCustomerSearch,
  setCustomerStatusFilter,
} from '../redux/customers/customers.actions'
import {
  selectCustomerHasNext,
  selectCustomerListError,
  selectCustomerListStatus,
  selectCustomerQuery,
  selectCustomers,
} from '../redux/customers/customers.selectors'
import type { Customer, CustomerQuery, CustomerStatusFilter, RequestStatus } from '../types/customers'

const SEARCH_DEBOUNCE_MS = 300

export interface UseCustomersResult {
  customers: Customer[]
  query: CustomerQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  searchInput: string
  setSearchInput: (value: string) => void
  setStatusFilter: (status: CustomerStatusFilter) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useCustomers(): UseCustomersResult {
  const dispatch = useAppDispatch()
  const customers = useAppSelector(selectCustomers)
  const query = useAppSelector(selectCustomerQuery)
  const hasNext = useAppSelector(selectCustomerHasNext)
  const listStatus = useAppSelector(selectCustomerListStatus)
  const listError = useAppSelector(selectCustomerListError)
  const [searchInput, setSearchInput] = useState(query.searchTerm)

  useEffect(() => {
    dispatch(loadCustomers())
  }, [dispatch])

  useEffect(() => {
    const searchTerm = searchInput.trim()
    if (searchTerm === query.searchTerm) return
    const timer = window.setTimeout(() => dispatch(setCustomerSearch(searchTerm)), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, searchInput, query.searchTerm])

  const setStatusFilter = useCallback((status: CustomerStatusFilter) => { dispatch(setCustomerStatusFilter(status)) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setCustomerPage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setCustomerPageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadCustomers()) }, [dispatch])

  return {
    customers,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setStatusFilter,
    setPage,
    setPageSize,
    retry,
  }
}
