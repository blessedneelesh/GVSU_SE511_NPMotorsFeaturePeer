import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/payables/payables.actions'
import payablesReducer, { initialPayablesState, type PayablesState } from '../../../redux/payables/payables.reducer'
import { overduePayable, overduePayableDetail, payablePage, payableVendorOptions } from '../../../test/fixtures/payables'

// A page-3 state with every filter set, so each reducer case can be shown to reset or keep them
const filtered: PayablesState = {
  ...initialPayablesState,
  items: [overduePayable],
  listStatus: 'success',
  listError: 'old error',
  query: { pageNumber: 3, pageSize: 10, status: 'overdue', vendorId: '3', asOfDate: '2024-04-01' },
}

describe('payablesReducer', () => {
  it('returns the initial state and ignores other slices\' actions', () => {
    expect(payablesReducer(undefined, { type: '@@INIT' })).toEqual(initialPayablesState)
    expect(initialPayablesState.query).toEqual({ pageNumber: 1, pageSize: 5, status: 'all', vendorId: 'all', asOfDate: '' })
    expect(payablesReducer(filtered, { type: 'receivables/load' })).toBe(filtered)
  })

  it('LOAD sets loading and clears the error, keeping the rows', () => {
    expect(payablesReducer(filtered, actions.loadPayables())).toEqual({ ...filtered, listStatus: 'loading', listError: null })
  })

  it('LOAD_SUCCESS stores the page', () => {
    expect(payablesReducer(filtered, actions.loadPayablesSuccess(payablePage)))
      .toMatchObject({ items: payablePage.items, hasNext: true, listStatus: 'success' })
  })

  it('LOAD_FAILURE stores the error', () => {
    expect(payablesReducer(filtered, actions.loadPayablesFailure('down'))).toMatchObject({ listStatus: 'error', listError: 'down' })
  })

  it.each([
    ['status', actions.setPayableStatusFilter('partial'), { status: 'partial' }],
    ['vendor', actions.setPayableVendorFilter('4'), { vendorId: '4' }],
    ['as-of date', actions.setPayableAsOfDate('2026-01-01'), { asOfDate: '2026-01-01' }],
    ['page size', actions.setPayablePageSize(25), { pageSize: 25 }],
  ])('changing the %s returns to page 1 and starts loading', (_, action, change) => {
    const next = payablesReducer(filtered, action)
    expect(next.query).toEqual({ ...filtered.query, ...change, pageNumber: 1 })
    expect(next).toMatchObject({ listStatus: 'loading', listError: null })
  })

  it('RESET_FILTERS clears the filters but keeps the page size', () => {
    expect(payablesReducer(filtered, actions.resetPayableFilters()).query)
      .toEqual({ pageNumber: 1, pageSize: 10, status: 'all', vendorId: 'all', asOfDate: '' })
  })

  it('SET_PAGE moves to the page, never below 1', () => {
    expect(payablesReducer(filtered, actions.setPayablePage(4)).query.pageNumber).toBe(4)
    expect(payablesReducer(filtered, actions.setPayablePage(0)).query.pageNumber).toBe(1)
  })

  it('SELECT opens the bill and starts loading it, keeping the list', () => {
    const next = payablesReducer({ ...filtered, selected: overduePayableDetail, detailError: 'old' }, actions.selectPayable('11'))
    expect(next).toMatchObject({ selectedId: '11', selected: null, detailStatus: 'loading', detailError: null })
    expect(next.items).toBe(filtered.items)
    expect(next.query).toBe(filtered.query)
  })

  it('stores the loaded bill or the error', () => {
    const loading = payablesReducer(filtered, actions.selectPayable('4'))
    expect(payablesReducer(loading, actions.loadPayableByIdSuccess(overduePayableDetail)))
      .toMatchObject({ selected: overduePayableDetail, detailStatus: 'success' })
    expect(payablesReducer(loading, actions.loadPayableByIdFailure('This bill no longer exists.')))
      .toMatchObject({ detailStatus: 'error', detailError: 'This bill no longer exists.' })
  })

  it('CLEAR_SELECTION closes the detail', () => {
    const open = { ...filtered, selectedId: '4', selected: overduePayableDetail, detailStatus: 'success' as const }
    expect(payablesReducer(open, actions.clearPayableSelection()))
      .toMatchObject({ selectedId: null, selected: null, detailStatus: 'idle', detailError: null })
  })

  it('tracks the vendor options request', () => {
    const loading = payablesReducer({ ...filtered, vendorOptionsError: 'old' }, actions.loadPayableVendorOptions())
    expect(loading).toMatchObject({ vendorOptionsStatus: 'loading', vendorOptionsError: null })
    expect(payablesReducer(loading, actions.loadPayableVendorOptionsSuccess(payableVendorOptions)))
      .toMatchObject({ vendorOptions: payableVendorOptions, vendorOptionsStatus: 'success' })
    expect(payablesReducer(loading, actions.loadPayableVendorOptionsFailure('no vendors')))
      .toMatchObject({ vendorOptionsStatus: 'error', vendorOptionsError: 'no vendors' })
  })
})
