import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectSalesInvoiceState = (state: RootState) => state.salesInvoices

export const selectSalesInvoices = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.items)

export const selectSalesInvoiceHasNext = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.hasNext)

export const selectSalesInvoiceQuery = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.query)

export const selectSalesInvoiceListStatus = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.listStatus)

export const selectSalesInvoiceListError = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.listError)

export const selectSelectedSalesInvoiceId = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.selectedId)

export const selectSelectedSalesInvoice = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.selected)

export const selectSalesInvoiceDetailStatus = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.detailStatus)

export const selectSalesInvoiceDetailError = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.detailError)

export const selectSalesInvoiceOptions = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.options)

export const selectSalesInvoiceOptionsStatus = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.optionsStatus)

export const selectSalesInvoiceOptionsError = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.optionsError)

export const selectSalesInvoiceSaveMode = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.saveMode)

export const selectSalesInvoiceSaveStatus = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.saveStatus)

export const selectSalesInvoiceSaveError = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.saveError)

export const selectSalesInvoiceFieldErrors = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.fieldErrors)

export const selectSalesInvoiceCancelStatus = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.cancelStatus)

export const selectSalesInvoiceCancelError = createSelector([selectSalesInvoiceState], (salesInvoices) => salesInvoices.cancelError)
