import { act, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MakePaymentDialog } from '../../../pages/AccountsPayablePage/MakePaymentDialog'
import { recordVendorPayment, recordVendorPaymentFailure, recordVendorPaymentSuccess } from '../../../redux/payables/payables.actions'
import { PAYABLE_ACTIONS } from '../../../redux/payables/payables.constants'
import type { PayablesState } from '../../../redux/payables/payables.reducer'
import {
  loadReceiptBankAccountOptions,
  loadReceiptBankAccountOptionsFailure,
  loadReceiptBankAccountOptionsSuccess,
} from '../../../redux/receipts/receipts.actions'
import type { ReceiptsState } from '../../../redux/receipts/receipts.reducer'
import { vendorPaymentTarget } from '../../../test/fixtures/payables'
import { receiptBankAccountOptions } from '../../../test/fixtures/receipts'
import { makeVendorPaymentState, renderWithProviders } from '../../../test/test-utils'

const pad = (value: number) => String(value).padStart(2, '0')
const now = new Date()
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

const loadedAccounts: Partial<ReceiptsState> = { bankAccountOptions: receiptBankAccountOptions, bankAccountOptionsStatus: 'success' }

function renderDialog(payables: Partial<PayablesState> = {}, receipts: Partial<ReceiptsState> = loadedAccounts) {
  const onClose = vi.fn()
  const result = renderWithProviders(<MakePaymentDialog bill={vendorPaymentTarget} onClose={onClose} />, {
    preloadedState: makeVendorPaymentState(payables, receipts),
  })
  return { ...result, onClose }
}

const amountInput = () => screen.getByRole('spinbutton', { name: /Payment Amount/ })
const submit = () => screen.getByRole('button', { name: 'Post Payment' })
const posts = (actions: { type: string }[]) => actions.filter((action) => action.type === PAYABLE_ACTIONS.RECORD_PAYMENT)

describe('MakePaymentDialog', () => {
  it('loads the accounts and starts from the full balance, today, a transfer and the first account', () => {
    const { actions } = renderDialog()

    expect(actions).toContainEqual(loadReceiptBankAccountOptions())
    expect(screen.getByRole('dialog', { name: 'Make Payment' })).toBeInTheDocument()
    expect(screen.getByText('AP-2026-000011 · ABC Auto Auction')).toBeInTheDocument()
    expect(screen.getByText('Bill Total').nextElementSibling).toHaveTextContent('$52,320.00')
    expect(screen.getByText('Already Paid').nextElementSibling).toHaveTextContent('$5,000.00')
    expect(screen.getByText('Balance Due').nextElementSibling).toHaveTextContent('$47,320.00')

    expect(amountInput()).toHaveValue(47320)
    expect(screen.getByLabelText(/Payment Date/)).toHaveValue(today)
    expect(screen.getByRole('combobox', { name: 'Payment Method' })).toHaveTextContent('Bank Transfer')
    expect(screen.getByRole('combobox', { name: /Pay From/ })).toHaveTextContent('Operating Checking — ****4521')
    expect(screen.getByText('This will fully settle the bill.')).toBeInTheDocument()
  })

  it('shows what will be left after a partial payment', async () => {
    const { user } = renderDialog()
    await user.clear(amountInput())
    await user.type(amountInput(), '7320')
    expect(screen.getByText('Remaining balance after payment: $40,000.00')).toBeInTheDocument()
  })

  it.each([
    ['', 'Payment amount is required'],
    ['0', 'Amount must be greater than zero'],
    ['10.555', 'Use at most two decimal places'],
    ['47320.01', 'Amount cannot exceed balance of $47,320.00'],
  ])('rejects an amount of "%s" without posting', async (value, message) => {
    const { actions, user } = renderDialog()
    await user.clear(amountInput())
    if (value) await user.type(amountInput(), value)
    await user.click(submit())
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(posts(actions)).toHaveLength(0)
  })

  it('requires an account to pay from', async () => {
    const { store, actions, user } = renderDialog({}, {})
    // Opening reloads the accounts; with no saga, answer with none
    act(() => { store.dispatch(loadReceiptBankAccountOptionsSuccess([])) })
    expect(screen.getByText('There are no active bank accounts to pay from.')).toBeInTheDocument()
    await user.click(submit())
    expect(screen.getByText('Choose the account to pay from')).toBeInTheDocument()
    expect(posts(actions)).toHaveLength(0)
  })

  it('posts the payment with the chosen method, account and reference', async () => {
    const { actions, user } = renderDialog()
    await user.clear(amountInput())
    await user.type(amountInput(), '2000.50')
    await user.click(screen.getByRole('combobox', { name: 'Payment Method' }))
    await user.click(screen.getByRole('option', { name: 'Check' }))
    await user.click(screen.getByRole('combobox', { name: /Pay From/ }))
    await user.click(screen.getByRole('option', { name: 'Payroll' }))
    await user.type(screen.getByRole('textbox', { name: 'Reference / Cheque #' }), 'CHK-1042')
    await user.click(submit())

    expect(posts(actions)).toEqual([recordVendorPayment({
      apBillId: '11',
      // jsdom's number input normalises "2000.50" to "2000.5"
      values: { paymentDate: today, amount: '2000.5', paymentMethod: 'check', bankAccountId: '3', reference: 'CHK-1042' },
    })])
  })

  it('disables the form while posting', async () => {
    const { store, user } = renderDialog()
    await user.click(submit())
    expect(store.getState().payables.saveStatus).toBe('loading')
    expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('shows the confirmation once posted, and closes on Done', async () => {
    const { store, user, onClose } = renderDialog()
    await user.clear(amountInput())
    await user.type(amountInput(), '7320')
    await user.click(submit())
    act(() => { store.dispatch(recordVendorPaymentSuccess()) })

    const dialog = screen.getByRole('dialog', { name: 'Payment Posted' })
    expect(within(dialog).getByText('$7,320.00 paid to', { exact: false })).toBeInTheDocument()
    expect(within(dialog).getByText('AP-2026-000011')).toBeInTheDocument()
    expect(within(dialog).getByText('Operating Checking — ****4521')).toBeInTheDocument()
    expect(within(dialog).getByText('$40,000.00')).toHaveClass('text-red')

    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('says a full payment settles the bill', async () => {
    const { store, user } = renderDialog()
    await user.click(submit())
    act(() => { store.dispatch(recordVendorPaymentSuccess()) })
    expect(screen.getByText('Fully settled')).toHaveClass('text-green')
  })

  it('shows a server field error until the field is edited, and a rejection in the banner', async () => {
    const { store, user } = renderDialog()
    await user.click(submit())
    act(() => { store.dispatch(recordVendorPaymentFailure({ message: '', fieldErrors: { amount: 'Amount exceeds the balance.' } })) })
    expect(screen.getByText('Amount exceeds the balance.')).toBeInTheDocument()
    await user.type(amountInput(), '0')
    expect(screen.queryByText('Amount exceeds the balance.')).not.toBeInTheDocument()

    act(() => { store.dispatch(recordVendorPaymentFailure({ message: 'Bank account is inactive.', fieldErrors: {} })) })
    expect(screen.getByText('Bank account is inactive.')).toBeInTheDocument()
  })

  it('shows a failed account load with a retry', async () => {
    const { store, actions, user } = renderDialog({}, {})
    act(() => { store.dispatch(loadReceiptBankAccountOptionsFailure('Bank accounts could not be loaded. Please try again.')) })
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadReceiptBankAccountOptions().type)).toHaveLength(2)
  })

  it('closes from Cancel and the close button', async () => {
    const { user, onClose } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Close make payment form' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
