import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { loadSalesInvoiceOptions } from '../redux/salesInvoices/salesInvoices.actions'
import {
  selectSalesInvoiceOptions,
  selectSalesInvoiceOptionsError,
  selectSalesInvoiceOptionsStatus,
} from '../redux/salesInvoices/salesInvoices.selectors'
import type { RequestStatus } from '../types/common'
import type { Customer } from '../types/customers'
import type { SalesInvoiceOptions } from '../types/salesInvoices'

export interface UseSalesInvoiceOptionsResult {
  options: SalesInvoiceOptions
  optionsStatus: RequestStatus
  optionsError: string | null
  salespersonName: (employeeId: string) => string
  findCustomer: (customerId: string) => Customer | undefined
  retry: () => void
}

// Loads on mount, so the Salesperson column and each opening of the form use current customers and vehicles
export function useSalesInvoiceOptions(): UseSalesInvoiceOptionsResult {
  const dispatch = useAppDispatch()
  const options = useAppSelector(selectSalesInvoiceOptions)
  const optionsStatus = useAppSelector(selectSalesInvoiceOptionsStatus)
  const optionsError = useAppSelector(selectSalesInvoiceOptionsError)

  useEffect(() => {
    dispatch(loadSalesInvoiceOptions())
  }, [dispatch])

  const salespersonName = useCallback(
    (employeeId: string) =>
      employeeId ? options.employees.find((employee) => employee.id === employeeId)?.fullName ?? `Employee #${employeeId}` : '',
    [options.employees],
  )
  const findCustomer = useCallback(
    (customerId: string) => (customerId ? options.customers.find((customer) => customer.id === customerId) : undefined),
    [options.customers],
  )
  const retry = useCallback(() => { dispatch(loadSalesInvoiceOptions()) }, [dispatch])

  return { options, optionsStatus, optionsError, salespersonName, findCustomer, retry }
}
