import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/salesInvoices/salesInvoices.actions'
import { SALES_INVOICE_ACTIONS } from '../../../redux/salesInvoices/salesInvoices.constants'
import {
  postedInvoice,
  salesInvoiceFormValues,
  salesInvoiceOptions,
  salesInvoicePage,
  salesInvoiceSaveError,
} from '../../../test/fixtures/salesInvoices'

describe('salesInvoices actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadSalesInvoices', actions.loadSalesInvoices, SALES_INVOICE_ACTIONS.LOAD],
      ['clearSalesInvoiceSelection', actions.clearSalesInvoiceSelection, SALES_INVOICE_ACTIONS.CLEAR_SELECTION],
      ['loadSalesInvoiceOptions', actions.loadSalesInvoiceOptions, SALES_INVOICE_ACTIONS.LOAD_OPTIONS],
      ['saveSalesInvoiceSuccess', actions.saveSalesInvoiceSuccess, SALES_INVOICE_ACTIONS.SAVE_SUCCESS],
      ['resetSalesInvoiceSave', actions.resetSalesInvoiceSave, SALES_INVOICE_ACTIONS.RESET_SAVE],
      ['cancelSalesInvoiceSuccess', actions.cancelSalesInvoiceSuccess, SALES_INVOICE_ACTIONS.CANCEL_SUCCESS],
      ['resetSalesInvoiceCancel', actions.resetSalesInvoiceCancel, SALES_INVOICE_ACTIONS.RESET_CANCEL],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadSalesInvoicesSuccess carries the page', () => {
    expect(actions.loadSalesInvoicesSuccess(salesInvoicePage)).toEqual({ type: SALES_INVOICE_ACTIONS.LOAD_SUCCESS, payload: salesInvoicePage })
  })

  it('loadSalesInvoicesFailure carries the message', () => {
    expect(actions.loadSalesInvoicesFailure('Network error')).toEqual({ type: SALES_INVOICE_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setSalesInvoiceSearch carries the search term', () => {
    expect(actions.setSalesInvoiceSearch('INV-2026')).toEqual({ type: SALES_INVOICE_ACTIONS.SET_SEARCH, payload: 'INV-2026' })
  })

  it('setSalesInvoiceStatusFilter carries the status', () => {
    expect(actions.setSalesInvoiceStatusFilter('partial')).toEqual({ type: SALES_INVOICE_ACTIONS.SET_STATUS_FILTER, payload: 'partial' })
  })

  it('setSalesInvoiceFromDate carries the date', () => {
    expect(actions.setSalesInvoiceFromDate('2026-10-01')).toEqual({ type: SALES_INVOICE_ACTIONS.SET_FROM_DATE, payload: '2026-10-01' })
  })

  it('setSalesInvoiceToDate carries the date', () => {
    expect(actions.setSalesInvoiceToDate('2026-10-31')).toEqual({ type: SALES_INVOICE_ACTIONS.SET_TO_DATE, payload: '2026-10-31' })
  })

  it('setSalesInvoicePage carries the page number', () => {
    expect(actions.setSalesInvoicePage(3)).toEqual({ type: SALES_INVOICE_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setSalesInvoicePageSize carries the page size', () => {
    expect(actions.setSalesInvoicePageSize(25)).toEqual({ type: SALES_INVOICE_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('selectSalesInvoice carries the id', () => {
    expect(actions.selectSalesInvoice('6')).toEqual({ type: SALES_INVOICE_ACTIONS.SELECT, payload: '6' })
  })

  it('loadSalesInvoiceByIdSuccess carries the invoice', () => {
    expect(actions.loadSalesInvoiceByIdSuccess(postedInvoice)).toEqual({ type: SALES_INVOICE_ACTIONS.LOAD_BY_ID_SUCCESS, payload: postedInvoice })
  })

  it('loadSalesInvoiceByIdFailure carries the message', () => {
    expect(actions.loadSalesInvoiceByIdFailure('Not found')).toEqual({ type: SALES_INVOICE_ACTIONS.LOAD_BY_ID_FAILURE, payload: 'Not found' })
  })

  it('loadSalesInvoiceOptionsSuccess carries the options', () => {
    expect(actions.loadSalesInvoiceOptionsSuccess(salesInvoiceOptions))
      .toEqual({ type: SALES_INVOICE_ACTIONS.LOAD_OPTIONS_SUCCESS, payload: salesInvoiceOptions })
  })

  it('loadSalesInvoiceOptionsFailure carries the message', () => {
    expect(actions.loadSalesInvoiceOptionsFailure('No customers'))
      .toEqual({ type: SALES_INVOICE_ACTIONS.LOAD_OPTIONS_FAILURE, payload: 'No customers' })
  })

  it('createSalesInvoice carries the form values', () => {
    expect(actions.createSalesInvoice(salesInvoiceFormValues)).toEqual({ type: SALES_INVOICE_ACTIONS.CREATE, payload: salesInvoiceFormValues })
  })

  it('postSalesInvoice carries the form values', () => {
    expect(actions.postSalesInvoice(salesInvoiceFormValues)).toEqual({ type: SALES_INVOICE_ACTIONS.POST, payload: salesInvoiceFormValues })
  })

  it('saveSalesInvoiceFailure carries the message and field errors', () => {
    expect(actions.saveSalesInvoiceFailure(salesInvoiceSaveError))
      .toEqual({ type: SALES_INVOICE_ACTIONS.SAVE_FAILURE, payload: salesInvoiceSaveError })
  })

  it('cancelSalesInvoice carries the id and reason', () => {
    const request = { id: '6', reason: 'Customer changed their mind' }
    expect(actions.cancelSalesInvoice(request)).toEqual({ type: SALES_INVOICE_ACTIONS.CANCEL, payload: request })
  })

  it('cancelSalesInvoiceFailure carries the message', () => {
    expect(actions.cancelSalesInvoiceFailure('This sales invoice no longer exists.'))
      .toEqual({ type: SALES_INVOICE_ACTIONS.CANCEL_FAILURE, payload: 'This sales invoice no longer exists.' })
  })
})
