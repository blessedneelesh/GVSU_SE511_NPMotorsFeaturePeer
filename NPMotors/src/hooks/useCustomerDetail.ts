import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { clearCustomerSelection, selectCustomer } from '../redux/customers/customers.actions'
import {
  selectCustomerDetailError,
  selectCustomerDetailStatus,
  selectSelectedCustomer,
  selectSelectedCustomerId,
} from '../redux/customers/customers.selectors'
import type { RequestStatus } from '../types/common'
import type { Customer } from '../types/customers'

export interface UseCustomerDetailResult {
  selectedId: string | null
  customer: Customer | null
  detailStatus: RequestStatus
  detailError: string | null
  openCustomer: (id: string) => void
  closeCustomer: () => void
  retry: () => void
}

export function useCustomerDetail(): UseCustomerDetailResult {
  const dispatch = useAppDispatch()
  const selectedId = useAppSelector(selectSelectedCustomerId)
  const customer = useAppSelector(selectSelectedCustomer)
  const detailStatus = useAppSelector(selectCustomerDetailStatus)
  const detailError = useAppSelector(selectCustomerDetailError)

  const openCustomer = useCallback((id: string) => { dispatch(selectCustomer(id)) }, [dispatch])
  const closeCustomer = useCallback(() => { dispatch(clearCustomerSelection()) }, [dispatch])
  const retry = useCallback(() => { if (selectedId) dispatch(selectCustomer(selectedId)) }, [dispatch, selectedId])

  return { selectedId, customer, detailStatus, detailError, openCustomer, closeCustomer, retry }
}
