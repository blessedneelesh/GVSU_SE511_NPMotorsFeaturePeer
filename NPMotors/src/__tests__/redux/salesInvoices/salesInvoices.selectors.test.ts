import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/salesInvoices/salesInvoices.selectors'
import { makeSalesInvoiceState } from '../../../test/test-utils'
import { postedInvoice, salesInvoiceOptions, salesInvoicePage } from '../../../test/fixtures/salesInvoices'

const query = { pageNumber: 2, pageSize: 10, status: 'unpaid', fromDate: '2026-10-01', toDate: '2026-10-31', searchTerm: 'INV' } as const
const fieldErrors = { discount: 'Discount is too large' }

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeSalesInvoiceState({
  items: salesInvoicePage.items,
  hasNext: true,
  query,
  listStatus: 'success',
  listError: 'list error',
  selectedId: '6',
  selected: postedInvoice,
  detailStatus: 'error',
  detailError: 'detail error',
  options: salesInvoiceOptions,
  optionsStatus: 'success',
  optionsError: 'options error',
  saveMode: 'post',
  saveStatus: 'loading',
  saveError: 'save error',
  fieldErrors,
  cancelStatus: 'error',
  cancelError: 'cancel error',
})

describe('salesInvoices selectors', () => {
  it('selectSalesInvoiceState returns the slice', () => {
    expect(selectors.selectSalesInvoiceState(state)).toBe(state.salesInvoices)
  })

  it.each([
    ['selectSalesInvoices', selectors.selectSalesInvoices, salesInvoicePage.items],
    ['selectSalesInvoiceHasNext', selectors.selectSalesInvoiceHasNext, true],
    ['selectSalesInvoiceQuery', selectors.selectSalesInvoiceQuery, query],
    ['selectSalesInvoiceListStatus', selectors.selectSalesInvoiceListStatus, 'success'],
    ['selectSalesInvoiceListError', selectors.selectSalesInvoiceListError, 'list error'],
    ['selectSelectedSalesInvoiceId', selectors.selectSelectedSalesInvoiceId, '6'],
    ['selectSelectedSalesInvoice', selectors.selectSelectedSalesInvoice, postedInvoice],
    ['selectSalesInvoiceDetailStatus', selectors.selectSalesInvoiceDetailStatus, 'error'],
    ['selectSalesInvoiceDetailError', selectors.selectSalesInvoiceDetailError, 'detail error'],
    ['selectSalesInvoiceOptions', selectors.selectSalesInvoiceOptions, salesInvoiceOptions],
    ['selectSalesInvoiceOptionsStatus', selectors.selectSalesInvoiceOptionsStatus, 'success'],
    ['selectSalesInvoiceOptionsError', selectors.selectSalesInvoiceOptionsError, 'options error'],
    ['selectSalesInvoiceSaveMode', selectors.selectSalesInvoiceSaveMode, 'post'],
    ['selectSalesInvoiceSaveStatus', selectors.selectSalesInvoiceSaveStatus, 'loading'],
    ['selectSalesInvoiceSaveError', selectors.selectSalesInvoiceSaveError, 'save error'],
    ['selectSalesInvoiceFieldErrors', selectors.selectSalesInvoiceFieldErrors, fieldErrors],
    ['selectSalesInvoiceCancelStatus', selectors.selectSalesInvoiceCancelStatus, 'error'],
    ['selectSalesInvoiceCancelError', selectors.selectSalesInvoiceCancelError, 'cancel error'],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectSalesInvoices(state)).toBe(selectors.selectSalesInvoices(state))
      expect(selectors.selectSalesInvoiceQuery(state)).toBe(selectors.selectSalesInvoiceQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectSalesInvoices(state)
      const next = { ...state, salesInvoices: { ...state.salesInvoices, listStatus: 'loading' as const } }
      expect(selectors.selectSalesInvoices(next)).toBe(before)
    })

    it('keeps the items reference when only another slice changes', () => {
      const before = selectors.selectSalesInvoices(state)
      const next = { ...state, parts: { ...state.parts, listStatus: 'loading' as const } }
      expect(selectors.selectSalesInvoices(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, salesInvoices: { ...state.salesInvoices, items: [postedInvoice] } }
      expect(selectors.selectSalesInvoices(next)).toEqual([postedInvoice])
    })
  })
})
