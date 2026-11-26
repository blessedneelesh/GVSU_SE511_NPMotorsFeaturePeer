import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/payables/payables.actions'
import payablesReducer, { initialPayablesState, type PayablesState } from '../../../redux/payables/payables.reducer'
import { overduePayable, overduePayableDetail, payablePage, payablePayments, payableVendorOptions, vendorPaymentFormValues } from '../../../test/fixtures/payables'

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

  describe('payment history', () => {
    const loaded: PayablesState = {
      ...initialPayablesState, paymentHistoryBillId: '10', payments: payablePayments, paymentHistoryStatus: 'success',
    }

    it('keeps the payments on screen while the same bill reloads', () => {
      expect(payablesReducer(loaded, actions.loadPayablePaymentHistory('10')))
        .toMatchObject({ paymentHistoryBillId: '10', payments: payablePayments, paymentHistoryStatus: 'loading', paymentHistoryError: null })
    })

    it('starts empty for another bill', () => {
      expect(payablesReducer(loaded, actions.loadPayablePaymentHistory('11')))
        .toMatchObject({ paymentHistoryBillId: '11', payments: [], paymentHistoryStatus: 'loading' })
    })

    it('stores the payments of the bill being loaded, ignoring a late answer for another bill', () => {
      const loading = payablesReducer(initialPayablesState, actions.loadPayablePaymentHistory('10'))
      expect(payablesReducer(loading, actions.loadPayablePaymentHistorySuccess({ apBillId: '10', payments: payablePayments })))
        .toMatchObject({ payments: payablePayments, paymentHistoryStatus: 'success' })
      expect(payablesReducer(loading, actions.loadPayablePaymentHistorySuccess({ apBillId: '4', payments: payablePayments }))).toBe(loading)
    })

    it('stores the error, and clears everything on close', () => {
      expect(payablesReducer(loaded, actions.loadPayablePaymentHistoryFailure('down')))
        .toMatchObject({ paymentHistoryStatus: 'error', paymentHistoryError: 'down' })
      expect(payablesReducer(loaded, actions.clearPayablePaymentHistory()))
        .toMatchObject({ paymentHistoryBillId: null, payments: [], paymentHistoryStatus: 'idle', paymentHistoryError: null })
    })
  })

  describe('make payment', () => {
    const failed: PayablesState = { ...initialPayablesState, saveStatus: 'error', saveError: 'old', fieldErrors: { amount: 'old' } }

    it('RECORD_PAYMENT starts saving and clears the old errors', () => {
      expect(payablesReducer(failed, actions.recordVendorPayment({ apBillId: '11', values: vendorPaymentFormValues })))
        .toMatchObject({ saveStatus: 'loading', saveError: null, fieldErrors: {} })
    })

    it('stores success, or the banner message and field errors', () => {
      expect(payablesReducer(failed, actions.recordVendorPaymentSuccess()).saveStatus).toBe('success')
      expect(payablesReducer(initialPayablesState, actions.recordVendorPaymentFailure({ message: '', fieldErrors: { amount: 'Too much' } })))
        .toMatchObject({ saveStatus: 'error', saveError: null, fieldErrors: { amount: 'Too much' } })
      expect(payablesReducer(initialPayablesState, actions.recordVendorPaymentFailure({ message: 'Inactive account', fieldErrors: {} })))
        .toMatchObject({ saveStatus: 'error', saveError: 'Inactive account' })
    })

    it('RESET_SAVE clears the payment state', () => {
      expect(payablesReducer(failed, actions.resetPayableSave()))
        .toMatchObject({ saveStatus: 'idle', saveError: null, fieldErrors: {} })
    })
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
