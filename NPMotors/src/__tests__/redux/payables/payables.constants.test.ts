import { describe, expect, it } from 'vitest'
import { PAYABLE_ACTIONS } from '../../../redux/payables/payables.constants'

describe('PAYABLE_ACTIONS', () => {
  it.each([
    ['LOAD', 'payables/load'],
    ['LOAD_SUCCESS', 'payables/loadSuccess'],
    ['LOAD_FAILURE', 'payables/loadFailure'],
    ['SET_STATUS_FILTER', 'payables/setStatusFilter'],
    ['SET_VENDOR_FILTER', 'payables/setVendorFilter'],
    ['SET_AS_OF_DATE', 'payables/setAsOfDate'],
    ['RESET_FILTERS', 'payables/resetFilters'],
    ['SET_PAGE', 'payables/setPage'],
    ['SET_PAGE_SIZE', 'payables/setPageSize'],
    ['SELECT', 'payables/select'],
    ['CLEAR_SELECTION', 'payables/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'payables/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'payables/loadByIdFailure'],
    ['LOAD_VENDOR_OPTIONS', 'payables/loadVendorOptions'],
    ['LOAD_VENDOR_OPTIONS_SUCCESS', 'payables/loadVendorOptionsSuccess'],
    ['LOAD_VENDOR_OPTIONS_FAILURE', 'payables/loadVendorOptionsFailure'],
  ] as const)('%s equals %s', (key, value) => {
    expect(PAYABLE_ACTIONS[key]).toBe(value)
  })

  it('has 16 action types', () => {
    expect(Object.keys(PAYABLE_ACTIONS)).toHaveLength(16)
  })

  it('has unique values', () => {
    const values = Object.values(PAYABLE_ACTIONS)
    expect(new Set(values).size).toBe(values.length)
  })
})
