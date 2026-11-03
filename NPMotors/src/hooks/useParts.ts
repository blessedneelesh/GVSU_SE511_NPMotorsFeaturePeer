import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadParts,
  setPartCategoryFilter,
  setPartPage,
  setPartPageSize,
  setPartSearch,
  setPartStockFilter,
} from '../redux/parts/parts.actions'
import {
  selectPartHasNext,
  selectPartListError,
  selectPartListStatus,
  selectPartQuery,
  selectParts,
} from '../redux/parts/parts.selectors'
import type { RequestStatus } from '../types/common'
import type { Part, PartCategoryFilter, PartQuery, PartStockFilter } from '../types/parts'

const SEARCH_DEBOUNCE_MS = 300

export interface UsePartsResult {
  parts: Part[]
  query: PartQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  searchInput: string
  setSearchInput: (value: string) => void
  setCategoryFilter: (category: PartCategoryFilter) => void
  setStockFilter: (stock: PartStockFilter) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useParts(): UsePartsResult {
  const dispatch = useAppDispatch()
  const parts = useAppSelector(selectParts)
  const query = useAppSelector(selectPartQuery)
  const hasNext = useAppSelector(selectPartHasNext)
  const listStatus = useAppSelector(selectPartListStatus)
  const listError = useAppSelector(selectPartListError)
  const [searchInput, setSearchInput] = useState(query.searchTerm)

  useEffect(() => {
    dispatch(loadParts())
  }, [dispatch])

  useEffect(() => {
    const searchTerm = searchInput.trim()
    if (searchTerm === query.searchTerm) return
    const timer = window.setTimeout(() => dispatch(setPartSearch(searchTerm)), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, searchInput, query.searchTerm])

  const setCategoryFilter = useCallback((category: PartCategoryFilter) => { dispatch(setPartCategoryFilter(category)) }, [dispatch])
  const setStockFilter = useCallback((stock: PartStockFilter) => { dispatch(setPartStockFilter(stock)) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setPartPage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setPartPageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadParts()) }, [dispatch])

  return {
    parts,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setCategoryFilter,
    setStockFilter,
    setPage,
    setPageSize,
    retry,
  }
}
