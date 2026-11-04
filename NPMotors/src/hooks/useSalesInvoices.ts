import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadSalesInvoices,
  setSalesInvoiceFromDate,
  setSalesInvoicePage,
  setSalesInvoicePageSize,
  setSalesInvoiceSearch,
  setSalesInvoiceStatusFilter,
  setSalesInvoiceToDate,
} from '../redux/salesInvoices/salesInvoices.actions'
import {
  selectSalesInvoiceHasNext,
  selectSalesInvoiceListError,
  selectSalesInvoiceListStatus,
  selectSalesInvoiceQuery,
  selectSalesInvoices,
} from '../redux/salesInvoices/salesInvoices.selectors'
import type { RequestStatus } from '../types/common'
import type { SalesInvoice, SalesInvoiceQuery, SalesInvoiceStatusFilter } from '../types/salesInvoices'

const SEARCH_DEBOUNCE_MS = 300

export interface UseSalesInvoicesResult {
  salesInvoices: SalesInvoice[]
  query: SalesInvoiceQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  searchInput: string
  setSearchInput: (value: string) => void
  setStatusFilter: (status: SalesInvoiceStatusFilter) => void
  setFromDate: (date: string) => void
  setToDate: (date: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useSalesInvoices(): UseSalesInvoicesResult {
  const dispatch = useAppDispatch()
  const salesInvoices = useAppSelector(selectSalesInvoices)
  const query = useAppSelector(selectSalesInvoiceQuery)
  const hasNext = useAppSelector(selectSalesInvoiceHasNext)
  const listStatus = useAppSelector(selectSalesInvoiceListStatus)
  const listError = useAppSelector(selectSalesInvoiceListError)
  const [searchInput, setSearchInput] = useState(query.searchTerm)

  useEffect(() => {
    dispatch(loadSalesInvoices())
  }, [dispatch])

  useEffect(() => {
    const searchTerm = searchInput.trim()
    if (searchTerm === query.searchTerm) return
    const timer = window.setTimeout(() => dispatch(setSalesInvoiceSearch(searchTerm)), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, searchInput, query.searchTerm])

  const setStatusFilter = useCallback((status: SalesInvoiceStatusFilter) => { dispatch(setSalesInvoiceStatusFilter(status)) }, [dispatch])
  const setFromDate = useCallback((date: string) => { dispatch(setSalesInvoiceFromDate(date)) }, [dispatch])
  const setToDate = useCallback((date: string) => { dispatch(setSalesInvoiceToDate(date)) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setSalesInvoicePage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setSalesInvoicePageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadSalesInvoices()) }, [dispatch])

  return {
    salesInvoices,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setStatusFilter,
    setFromDate,
    setToDate,
    setPage,
    setPageSize,
    retry,
  }
}
