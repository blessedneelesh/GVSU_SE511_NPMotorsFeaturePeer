import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadVehicles,
  setVehiclePage,
  setVehiclePageSize,
  setVehicleSearch,
  setVehicleStatusFilter,
} from '../redux/vehicles/vehicles.actions'
import {
  selectVehicleHasNext,
  selectVehicleListError,
  selectVehicleListStatus,
  selectVehicleQuery,
  selectVehicles,
} from '../redux/vehicles/vehicles.selectors'
import type { RequestStatus } from '../types/common'
import type { Vehicle, VehicleQuery, VehicleStatusFilter } from '../types/vehicles'

const SEARCH_DEBOUNCE_MS = 300

export interface UseVehiclesResult {
  vehicles: Vehicle[]
  query: VehicleQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  searchInput: string
  setSearchInput: (value: string) => void
  setStatusFilter: (status: VehicleStatusFilter) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useVehicles(): UseVehiclesResult {
  const dispatch = useAppDispatch()
  const vehicles = useAppSelector(selectVehicles)
  const query = useAppSelector(selectVehicleQuery)
  const hasNext = useAppSelector(selectVehicleHasNext)
  const listStatus = useAppSelector(selectVehicleListStatus)
  const listError = useAppSelector(selectVehicleListError)
  const [searchInput, setSearchInput] = useState(query.searchTerm)

  useEffect(() => {
    dispatch(loadVehicles())
  }, [dispatch])

  useEffect(() => {
    const searchTerm = searchInput.trim()
    if (searchTerm === query.searchTerm) return
    const timer = window.setTimeout(() => dispatch(setVehicleSearch(searchTerm)), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, searchInput, query.searchTerm])

  const setStatusFilter = useCallback((status: VehicleStatusFilter) => { dispatch(setVehicleStatusFilter(status)) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setVehiclePage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setVehiclePageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadVehicles()) }, [dispatch])

  return {
    vehicles,
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
