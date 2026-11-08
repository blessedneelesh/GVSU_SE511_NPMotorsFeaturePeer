import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadBankAccounts,
  setBankAccountBankFilter,
  setBankAccountPage,
  setBankAccountPageSize,
  setBankAccountSearch,
} from '../redux/bankAccounts/bankAccounts.actions'
import {
  selectBankAccountHasNext,
  selectBankAccountListError,
  selectBankAccountListStatus,
  selectBankAccountQuery,
  selectBankAccounts,
} from '../redux/bankAccounts/bankAccounts.selectors'
import type { RequestStatus } from '../types/common'
import type { BankAccount, BankAccountBankFilter, BankAccountQuery } from '../types/bankAccounts'

const SEARCH_DEBOUNCE_MS = 300

export interface UseBankAccountsResult {
  bankAccounts: BankAccount[]
  query: BankAccountQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  searchInput: string
  setSearchInput: (value: string) => void
  setBankFilter: (bankId: BankAccountBankFilter) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useBankAccounts(): UseBankAccountsResult {
  const dispatch = useAppDispatch()
  const bankAccounts = useAppSelector(selectBankAccounts)
  const query = useAppSelector(selectBankAccountQuery)
  const hasNext = useAppSelector(selectBankAccountHasNext)
  const listStatus = useAppSelector(selectBankAccountListStatus)
  const listError = useAppSelector(selectBankAccountListError)
  const [searchInput, setSearchInput] = useState(query.searchTerm)

  useEffect(() => {
    dispatch(loadBankAccounts())
  }, [dispatch])

  useEffect(() => {
    const searchTerm = searchInput.trim()
    if (searchTerm === query.searchTerm) return
    const timer = window.setTimeout(() => dispatch(setBankAccountSearch(searchTerm)), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, searchInput, query.searchTerm])

  const setBankFilter = useCallback((bankId: BankAccountBankFilter) => { dispatch(setBankAccountBankFilter(bankId)) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setBankAccountPage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setBankAccountPageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadBankAccounts()) }, [dispatch])

  return {
    bankAccounts,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setBankFilter,
    setPage,
    setPageSize,
    retry,
  }
}
