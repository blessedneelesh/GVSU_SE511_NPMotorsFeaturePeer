import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectReceiptState = (state: RootState) => state.receipts

export const selectReceiptBankAccountOptions = createSelector([selectReceiptState], (receipts) => receipts.bankAccountOptions)

export const selectReceiptBankAccountOptionsStatus = createSelector([selectReceiptState], (receipts) => receipts.bankAccountOptionsStatus)

export const selectReceiptBankAccountOptionsError = createSelector([selectReceiptState], (receipts) => receipts.bankAccountOptionsError)

export const selectReceiptSaveStatus = createSelector([selectReceiptState], (receipts) => receipts.saveStatus)

export const selectReceiptSaveError = createSelector([selectReceiptState], (receipts) => receipts.saveError)

export const selectReceiptFieldErrors = createSelector([selectReceiptState], (receipts) => receipts.fieldErrors)

export const selectReceiptPaymentHistoryInvoiceId = createSelector([selectReceiptState], (receipts) => receipts.paymentHistoryInvoiceId)

export const selectReceiptPayments = createSelector([selectReceiptState], (receipts) => receipts.payments)

export const selectReceiptPaymentHistoryStatus = createSelector([selectReceiptState], (receipts) => receipts.paymentHistoryStatus)

export const selectReceiptPaymentHistoryError = createSelector([selectReceiptState], (receipts) => receipts.paymentHistoryError)

export const selectReceiptCustomerInvoicesCustomerId = createSelector([selectReceiptState], (receipts) => receipts.customerInvoicesCustomerId)

export const selectReceiptCustomerInvoices = createSelector([selectReceiptState], (receipts) => receipts.customerInvoices)

export const selectReceiptCustomerInvoicesStatus = createSelector([selectReceiptState], (receipts) => receipts.customerInvoicesStatus)

export const selectReceiptCustomerInvoicesError = createSelector([selectReceiptState], (receipts) => receipts.customerInvoicesError)
