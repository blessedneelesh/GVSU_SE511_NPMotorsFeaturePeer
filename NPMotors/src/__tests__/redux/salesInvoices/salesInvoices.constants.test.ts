import { describe, expect, it } from 'vitest'
import { CUSTOMER_ACTIONS } from '../../../redux/customers/customers.constants'
import { EMPLOYEE_ACTIONS } from '../../../redux/employees/employees.constants'
import { PART_ACTIONS } from '../../../redux/parts/parts.constants'
import { SALES_INVOICE_ACTIONS } from '../../../redux/salesInvoices/salesInvoices.constants'
import { VEHICLE_ACTIONS } from '../../../redux/vehicles/vehicles.constants'
import { VENDOR_ACTIONS } from '../../../redux/vendors/vendors.constants'

describe('SALES_INVOICE_ACTIONS', () => {
  it.each([
    ['LOAD', 'salesInvoices/load'],
    ['LOAD_SUCCESS', 'salesInvoices/loadSuccess'],
    ['LOAD_FAILURE', 'salesInvoices/loadFailure'],
    ['SET_SEARCH', 'salesInvoices/setSearch'],
    ['SET_STATUS_FILTER', 'salesInvoices/setStatusFilter'],
    ['SET_FROM_DATE', 'salesInvoices/setFromDate'],
    ['SET_TO_DATE', 'salesInvoices/setToDate'],
    ['SET_PAGE', 'salesInvoices/setPage'],
    ['SET_PAGE_SIZE', 'salesInvoices/setPageSize'],
    ['SELECT', 'salesInvoices/select'],
    ['CLEAR_SELECTION', 'salesInvoices/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'salesInvoices/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'salesInvoices/loadByIdFailure'],
    ['LOAD_OPTIONS', 'salesInvoices/loadOptions'],
    ['LOAD_OPTIONS_SUCCESS', 'salesInvoices/loadOptionsSuccess'],
    ['LOAD_OPTIONS_FAILURE', 'salesInvoices/loadOptionsFailure'],
    ['CREATE', 'salesInvoices/create'],
    ['POST', 'salesInvoices/post'],
    ['SAVE_SUCCESS', 'salesInvoices/saveSuccess'],
    ['SAVE_FAILURE', 'salesInvoices/saveFailure'],
    ['RESET_SAVE', 'salesInvoices/resetSave'],
    ['CANCEL', 'salesInvoices/cancel'],
    ['CANCEL_SUCCESS', 'salesInvoices/cancelSuccess'],
    ['CANCEL_FAILURE', 'salesInvoices/cancelFailure'],
    ['RESET_CANCEL', 'salesInvoices/resetCancel'],
  ] as const)('%s equals %s', (key, value) => {
    expect(SALES_INVOICE_ACTIONS[key]).toBe(value)
  })

  it('has 25 action types', () => {
    expect(Object.keys(SALES_INVOICE_ACTIONS)).toHaveLength(25)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(SALES_INVOICE_ACTIONS)).size).toBe(Object.keys(SALES_INVOICE_ACTIONS).length)
  })

  it('prefixes every value with salesInvoices/', () => {
    for (const value of Object.values(SALES_INVOICE_ACTIONS)) expect(value).toMatch(/^salesInvoices\//)
  })

  // Each reducer's type guard is a Set of its own types, so a shared string would make two slices react
  it('shares no type string with the other slices', () => {
    const otherTypes = new Set<string>([
      ...Object.values(CUSTOMER_ACTIONS),
      ...Object.values(VENDOR_ACTIONS),
      ...Object.values(EMPLOYEE_ACTIONS),
      ...Object.values(VEHICLE_ACTIONS),
      ...Object.values(PART_ACTIONS),
    ])
    for (const value of Object.values(SALES_INVOICE_ACTIONS)) expect(otherTypes.has(value)).toBe(false)
  })
})
