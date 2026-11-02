import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadVendors,
  setVendorPage,
  setVendorPageSize,
  setVendorSearch,
  setVendorTypeFilter,
} from '../redux/vendors/vendors.actions'
import {
  selectVendorHasNext,
  selectVendorListError,
  selectVendorListStatus,
  selectVendorQuery,
  selectVendors,
} from '../redux/vendors/vendors.selectors'
import type { RequestStatus } from '../types/common'
import type { Vendor, VendorQuery, VendorTypeFilter } from '../types/vendors'

const SEARCH_DEBOUNCE_MS = 300

export interface UseVendorsResult {
  vendors: Vendor[]
  query: VendorQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  searchInput: string
  setSearchInput: (value: string) => void
  setTypeFilter: (type: VendorTypeFilter) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useVendors(): UseVendorsResult {
  const dispatch = useAppDispatch()
  const vendors = useAppSelector(selectVendors)
  const query = useAppSelector(selectVendorQuery)
  const hasNext = useAppSelector(selectVendorHasNext)
  const listStatus = useAppSelector(selectVendorListStatus)
  const listError = useAppSelector(selectVendorListError)
  const [searchInput, setSearchInput] = useState(query.searchTerm)

  useEffect(() => {
    dispatch(loadVendors())
  }, [dispatch])

  useEffect(() => {
    const searchTerm = searchInput.trim()
    if (searchTerm === query.searchTerm) return
    const timer = window.setTimeout(() => dispatch(setVendorSearch(searchTerm)), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, searchInput, query.searchTerm])

  const setTypeFilter = useCallback((type: VendorTypeFilter) => { dispatch(setVendorTypeFilter(type)) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setVendorPage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setVendorPageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadVendors()) }, [dispatch])

  return {
    vendors,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setTypeFilter,
    setPage,
    setPageSize,
    retry,
  }
}
