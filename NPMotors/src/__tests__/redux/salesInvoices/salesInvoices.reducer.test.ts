import { describe, expect, it } from 'vitest'
import { loadCustomers } from '../../../redux/customers/customers.actions'
import { loadEmployees } from '../../../redux/employees/employees.actions'
import { loadParts } from '../../../redux/parts/parts.actions'
import * as actions from '../../../redux/salesInvoices/salesInvoices.actions'
import salesInvoicesReducer, {
  initialSalesInvoicesState,
  type SalesInvoicesState,
} from '../../../redux/salesInvoices/salesInvoices.reducer'
import { loadVehicles } from '../../../redux/vehicles/vehicles.actions'
import { loadVendors } from '../../../redux/vendors/vendors.actions'
import {
  postedInvoice,
  salesInvoiceFormValues,
  salesInvoiceOptions,
  salesInvoicePage,
  salesInvoiceSaveError,
} from '../../../test/fixtures/salesInvoices'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: SalesInvoicesState): SalesInvoicesState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.options)
  Object.freeze(state.fieldErrors)
  return Object.freeze(state)
}

const initial = () => frozen({
  ...initialSalesInvoicesState,
  query: { ...initialSalesInvoicesState.query },
  items: [],
  options: { customers: [], employees: [], salespeople: [], vehicles: [] },
  fieldErrors: {},
})

describe('salesInvoicesReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(salesInvoicesReducer(undefined, { type: '@@INIT' })).toEqual(initialSalesInvoicesState)
  })

  it('starts on page 1 with 5 rows and no filters', () => {
    expect(initialSalesInvoicesState.query)
      .toEqual({ pageNumber: 1, pageSize: 5, status: 'all', fromDate: '', toDate: '', searchTerm: '' })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(salesInvoicesReducer(state, { type: 'other/action' })).toBe(state)
  })

  it.each([
    ['customers', loadCustomers()],
    ['vendors', loadVendors()],
    ['employees', loadEmployees()],
    ['vehicles', loadVehicles()],
    ['parts', loadParts()],
  ])('ignores %s actions', (_, action) => {
    const state = initial()
    expect(salesInvoicesReducer(state, action)).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialSalesInvoicesState, listError: 'old error' })
      expect(salesInvoicesReducer(state, actions.loadSalesInvoices()))
        .toEqual({ ...initialSalesInvoicesState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(salesInvoicesReducer(initial(), actions.loadSalesInvoicesSuccess(salesInvoicePage))).toEqual({
        ...initialSalesInvoicesState,
        items: salesInvoicePage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(salesInvoicesReducer(initial(), actions.loadSalesInvoicesFailure('Network error'))).toEqual({
        ...initialSalesInvoicesState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialSalesInvoicesState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialSalesInvoicesState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it.each([
      ['SET_SEARCH', actions.setSalesInvoiceSearch('INV-2026'), { searchTerm: 'INV-2026' }],
      ['SET_STATUS_FILTER', actions.setSalesInvoiceStatusFilter('unpaid'), { status: 'unpaid' }],
      ['SET_FROM_DATE', actions.setSalesInvoiceFromDate('2026-10-01'), { fromDate: '2026-10-01' }],
      ['SET_TO_DATE', actions.setSalesInvoiceToDate('2026-10-31'), { toDate: '2026-10-31' }],
      ['SET_PAGE_SIZE', actions.setSalesInvoicePageSize(25), { pageSize: 25 }],
    ] as const)('%s sets its value and resets to page 1', (_, action, change) => {
      expect(salesInvoicesReducer(onPage3(), action)).toEqual({
        ...initialSalesInvoicesState,
        ...reloading,
        query: { ...initialSalesInvoicesState.query, ...change, pageNumber: 1 },
      })
    })

    it('SET_FROM_DATE clears the bound with an empty string', () => {
      const state = frozen({ ...initialSalesInvoicesState, query: { ...initialSalesInvoicesState.query, fromDate: '2026-10-01' } })
      expect(salesInvoicesReducer(state, actions.setSalesInvoiceFromDate('')).query.fromDate).toBe('')
    })

    it('keeps the other filters when one changes', () => {
      const state = frozen({
        ...initialSalesInvoicesState,
        query: { ...initialSalesInvoicesState.query, searchTerm: 'INV', status: 'posted', fromDate: '2026-10-01' },
      })
      expect(salesInvoicesReducer(state, actions.setSalesInvoiceToDate('2026-10-31')).query).toEqual({
        ...initialSalesInvoicesState.query,
        searchTerm: 'INV',
        status: 'posted',
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(salesInvoicesReducer(onPage3(), actions.setSalesInvoicePage(4))).toEqual({
        ...initialSalesInvoicesState,
        ...reloading,
        query: { ...initialSalesInvoicesState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(salesInvoicesReducer(onPage3(), actions.setSalesInvoicePage(0)).query.pageNumber).toBe(1)
      expect(salesInvoicesReducer(onPage3(), actions.setSalesInvoicePage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('detail', () => {
    it('SELECT stores the id, clears the previous invoice and starts loading', () => {
      const state = frozen({ ...initialSalesInvoicesState, selected: postedInvoice, detailStatus: 'error', detailError: 'old error' })
      expect(salesInvoicesReducer(state, actions.selectSalesInvoice('3'))).toEqual({
        ...initialSalesInvoicesState,
        selectedId: '3',
        selected: null,
        detailStatus: 'loading',
        detailError: null,
      })
    })

    it('LOAD_BY_ID_SUCCESS stores the invoice', () => {
      const state = frozen({ ...initialSalesInvoicesState, selectedId: '6', detailStatus: 'loading' })
      expect(salesInvoicesReducer(state, actions.loadSalesInvoiceByIdSuccess(postedInvoice))).toEqual({
        ...initialSalesInvoicesState,
        selectedId: '6',
        selected: postedInvoice,
        detailStatus: 'success',
      })
    })

    it('LOAD_BY_ID_FAILURE stores the error', () => {
      const state = frozen({ ...initialSalesInvoicesState, selectedId: '6', detailStatus: 'loading' })
      expect(salesInvoicesReducer(state, actions.loadSalesInvoiceByIdFailure('Not found'))).toEqual({
        ...initialSalesInvoicesState,
        selectedId: '6',
        detailStatus: 'error',
        detailError: 'Not found',
      })
    })

    it('CLEAR_SELECTION resets every detail field', () => {
      const state = frozen({ ...initialSalesInvoicesState, selectedId: '6', selected: postedInvoice, detailStatus: 'error', detailError: 'x' })
      expect(salesInvoicesReducer(state, actions.clearSalesInvoiceSelection())).toEqual(initialSalesInvoicesState)
    })
  })

  describe('options', () => {
    it('LOAD_OPTIONS starts loading, clears the error and keeps the current options', () => {
      const state = frozen({ ...initialSalesInvoicesState, options: salesInvoiceOptions, optionsStatus: 'error', optionsError: 'old' })
      expect(salesInvoicesReducer(state, actions.loadSalesInvoiceOptions())).toEqual({
        ...initialSalesInvoicesState,
        options: salesInvoiceOptions,
        optionsStatus: 'loading',
        optionsError: null,
      })
    })

    it('LOAD_OPTIONS_SUCCESS stores the customers, employees, salespeople and vehicles', () => {
      expect(salesInvoicesReducer(initial(), actions.loadSalesInvoiceOptionsSuccess(salesInvoiceOptions))).toEqual({
        ...initialSalesInvoicesState,
        options: salesInvoiceOptions,
        optionsStatus: 'success',
      })
    })

    it('LOAD_OPTIONS_FAILURE stores the error', () => {
      expect(salesInvoicesReducer(initial(), actions.loadSalesInvoiceOptionsFailure('No customers'))).toEqual({
        ...initialSalesInvoicesState,
        optionsStatus: 'error',
        optionsError: 'No customers',
      })
    })

    it('leaves the list untouched', () => {
      const state = frozen({ ...initialSalesInvoicesState, items: salesInvoicePage.items, listStatus: 'success' })
      const result = salesInvoicesReducer(state, actions.loadSalesInvoiceOptions())
      expect(result.items).toBe(state.items)
      expect(result.listStatus).toBe('success')
    })
  })

  describe('save', () => {
    // A failed save leaves its errors behind, so each case shows whether the next save clears them
    const afterFailure = () => frozen({
      ...initialSalesInvoicesState,
      saveStatus: 'error',
      saveError: 'old',
      fieldErrors: { discount: 'old' },
    })

    it.each([
      ['CREATE', actions.createSalesInvoice(salesInvoiceFormValues), 'draft'],
      ['POST', actions.postSalesInvoice(salesInvoiceFormValues), 'post'],
    ] as const)('%s records the save mode, starts saving and clears the errors', (_, action, saveMode) => {
      expect(salesInvoicesReducer(afterFailure(), action)).toEqual({
        ...initialSalesInvoicesState,
        saveMode,
        saveStatus: 'loading',
        saveError: null,
        fieldErrors: {},
      })
    })

    // Matches the saga's takeLeading, so the banner names the save that actually ran
    it.each([
      ['CREATE', actions.createSalesInvoice(salesInvoiceFormValues)],
      ['POST', actions.postSalesInvoice(salesInvoiceFormValues)],
    ] as const)('%s is ignored while another save is in flight', (_, action) => {
      const state = frozen({ ...initialSalesInvoicesState, saveMode: 'draft', saveStatus: 'loading' })
      expect(salesInvoicesReducer(state, action)).toBe(state)
    })

    it('SAVE_SUCCESS marks the save as done and keeps the mode for the banner', () => {
      const state = frozen({ ...initialSalesInvoicesState, saveMode: 'post', saveStatus: 'loading' })
      expect(salesInvoicesReducer(state, actions.saveSalesInvoiceSuccess())).toEqual({
        ...initialSalesInvoicesState,
        saveMode: 'post',
        saveStatus: 'success',
      })
    })

    it('SAVE_FAILURE stores the message and the field errors', () => {
      const state = frozen({ ...initialSalesInvoicesState, saveMode: 'draft', saveStatus: 'loading' })
      expect(salesInvoicesReducer(state, actions.saveSalesInvoiceFailure(salesInvoiceSaveError))).toEqual({
        ...initialSalesInvoicesState,
        saveMode: 'draft',
        saveStatus: 'error',
        saveError: salesInvoiceSaveError.message,
        fieldErrors: salesInvoiceSaveError.fieldErrors,
      })
    })

    it('SAVE_FAILURE stores null when the message is empty', () => {
      const result = salesInvoicesReducer(initial(), actions.saveSalesInvoiceFailure({ message: '', fieldErrors: { discount: 'Too large' } }))
      expect(result.saveStatus).toBe('error')
      expect(result.saveError).toBeNull()
      expect(result.fieldErrors).toEqual({ discount: 'Too large' })
    })

    it('RESET_SAVE returns every save field to idle', () => {
      const state = frozen({ ...afterFailure(), saveMode: 'post' })
      expect(salesInvoicesReducer(state, actions.resetSalesInvoiceSave())).toEqual(initialSalesInvoicesState)
    })

    it('leaves the cancel fields untouched', () => {
      const state = frozen({ ...initialSalesInvoicesState, cancelStatus: 'error', cancelError: 'x' })
      const result = salesInvoicesReducer(state, actions.resetSalesInvoiceSave())
      expect(result.cancelStatus).toBe('error')
      expect(result.cancelError).toBe('x')
    })
  })

  describe('cancel', () => {
    it('CANCEL starts cancelling and clears the error', () => {
      const state = frozen({ ...initialSalesInvoicesState, cancelStatus: 'error', cancelError: 'old' })
      expect(salesInvoicesReducer(state, actions.cancelSalesInvoice({ id: '6', reason: 'Changed mind' }))).toEqual({
        ...initialSalesInvoicesState,
        cancelStatus: 'loading',
        cancelError: null,
      })
    })

    it('CANCEL_SUCCESS marks the cancel as done', () => {
      const state = frozen({ ...initialSalesInvoicesState, cancelStatus: 'loading' })
      expect(salesInvoicesReducer(state, actions.cancelSalesInvoiceSuccess()))
        .toEqual({ ...initialSalesInvoicesState, cancelStatus: 'success' })
    })

    it('CANCEL_FAILURE stores the error', () => {
      const state = frozen({ ...initialSalesInvoicesState, cancelStatus: 'loading' })
      expect(salesInvoicesReducer(state, actions.cancelSalesInvoiceFailure('This sales invoice no longer exists.'))).toEqual({
        ...initialSalesInvoicesState,
        cancelStatus: 'error',
        cancelError: 'This sales invoice no longer exists.',
      })
    })

    it('RESET_CANCEL returns the cancel fields to idle and leaves the save fields alone', () => {
      const state = frozen({ ...initialSalesInvoicesState, cancelStatus: 'success', cancelError: 'x', saveStatus: 'error' })
      expect(salesInvoicesReducer(state, actions.resetSalesInvoiceCancel()))
        .toEqual({ ...initialSalesInvoicesState, saveStatus: 'error' })
    })
  })
})
