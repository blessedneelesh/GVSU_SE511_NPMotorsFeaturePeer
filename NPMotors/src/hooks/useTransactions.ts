import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import {
  loadTransactions,
  resetTransactionFilters,
  setTransactionBankAccountFilter,
  setTransactionDateFrom,
  setTransactionDateTo,
  setTransactionDirectionFilter,
  setTransactionPage,
  setTransactionPageSize,
} from '../redux/transactions/transactions.actions'
import {
  selectTransactionHasNext,
  selectTransactionListError,
  selectTransactionListStatus,
  selectTransactionQuery,
  selectTransactions,
} from '../redux/transactions/transactions.selectors'
import type { RequestStatus } from '../types/common'
import type {
  Transaction,
  TransactionBankAccountFilter,
  TransactionDirectionFilter,
  TransactionQuery,
} from '../types/transactions'

// GetAllTransactions has no SearchTerm, so unlike useCustomers there is no debounced search here
export interface UseTransactionsResult {
  transactions: Transaction[]
  query: TransactionQuery
  hasNext: boolean
  hasPrevious: boolean
  listStatus: RequestStatus
  listError: string | null
  setBankAccountFilter: (bankAccountId: TransactionBankAccountFilter) => void
  setDirectionFilter: (direction: TransactionDirectionFilter) => void
  setDateFrom: (date: string) => void
  setDateTo: (date: string) => void
  resetFilters: () => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  retry: () => void
}

export function useTransactions(): UseTransactionsResult {
  const dispatch = useAppDispatch()
  const transactions = useAppSelector(selectTransactions)
  const query = useAppSelector(selectTransactionQuery)
  const hasNext = useAppSelector(selectTransactionHasNext)
  const listStatus = useAppSelector(selectTransactionListStatus)
  const listError = useAppSelector(selectTransactionListError)

  useEffect(() => {
    dispatch(loadTransactions())
  }, [dispatch])

  const setBankAccountFilter = useCallback((bankAccountId: TransactionBankAccountFilter) => { dispatch(setTransactionBankAccountFilter(bankAccountId)) }, [dispatch])
  const setDirectionFilter = useCallback((direction: TransactionDirectionFilter) => { dispatch(setTransactionDirectionFilter(direction)) }, [dispatch])
  const setDateFrom = useCallback((date: string) => { dispatch(setTransactionDateFrom(date)) }, [dispatch])
  const setDateTo = useCallback((date: string) => { dispatch(setTransactionDateTo(date)) }, [dispatch])
  const resetFilters = useCallback(() => { dispatch(resetTransactionFilters()) }, [dispatch])
  const setPage = useCallback((page: number) => { dispatch(setTransactionPage(page)) }, [dispatch])
  const setPageSize = useCallback((size: number) => { dispatch(setTransactionPageSize(size)) }, [dispatch])
  const retry = useCallback(() => { dispatch(loadTransactions()) }, [dispatch])

  return {
    transactions,
    query,
    hasNext,
    hasPrevious: query.pageNumber > 1,
    listStatus,
    listError,
    setBankAccountFilter,
    setDirectionFilter,
    setDateFrom,
    setDateTo,
    resetFilters,
    setPage,
    setPageSize,
    retry,
  }
}
