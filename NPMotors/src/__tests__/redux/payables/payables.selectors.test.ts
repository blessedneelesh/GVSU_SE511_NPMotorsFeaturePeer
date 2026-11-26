import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/payables/payables.selectors'
import { makePayableState } from '../../../test/test-utils'
import { overduePayableDetail, payablePage, payableVendorOptions } from '../../../test/fixtures/payables'

const query = { pageNumber: 2, pageSize: 10, status: 'overdue', vendorId: '3', asOfDate: '2024-04-01' } as const

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makePayableState({
  items: payablePage.items,
  hasNext: true,
  query,
  listStatus: 'success',
  listError: 'list error',
  selectedId: '4',
  selected: overduePayableDetail,
  detailStatus: 'success',
  detailError: 'detail error',
  vendorOptions: payableVendorOptions,
  vendorOptionsStatus: 'error',
  vendorOptionsError: 'options error',
})

describe('payables selectors', () => {
  it('selectPayableState returns the slice', () => {
    expect(selectors.selectPayableState(state)).toBe(state.payables)
  })

  it.each([
    ['selectPayables', selectors.selectPayables, payablePage.items],
    ['selectPayableHasNext', selectors.selectPayableHasNext, true],
    ['selectPayableQuery', selectors.selectPayableQuery, query],
    ['selectPayableListStatus', selectors.selectPayableListStatus, 'success'],
    ['selectPayableListError', selectors.selectPayableListError, 'list error'],
    ['selectSelectedPayableId', selectors.selectSelectedPayableId, '4'],
    ['selectSelectedPayable', selectors.selectSelectedPayable, overduePayableDetail],
    ['selectPayableDetailStatus', selectors.selectPayableDetailStatus, 'success'],
    ['selectPayableDetailError', selectors.selectPayableDetailError, 'detail error'],
    ['selectPayableVendorOptions', selectors.selectPayableVendorOptions, payableVendorOptions],
    ['selectPayableVendorOptionsStatus', selectors.selectPayableVendorOptionsStatus, 'error'],
    ['selectPayableVendorOptionsError', selectors.selectPayableVendorOptionsError, 'options error'],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })
})
