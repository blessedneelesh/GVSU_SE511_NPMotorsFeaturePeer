import { act, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReceivePaymentDialog } from '../../../pages/AccountsReceivablePage/ReceivePaymentDialog'
import {
  loadReceiptBankAccountOptions,
  loadReceiptBankAccountOptionsFailure,
  loadReceiptBankAccountOptionsSuccess,
  recordArPayment,
  recordArPaymentSuccess,
} from '../../../redux/receipts/receipts.actions'
import { RECEIPT_ACTIONS } from '../../../redux/receipts/receipts.constants'
import type { ReceiptsState } from '../../../redux/receipts/receipts.reducer'
import { receiptBankAccountOptions, receiptTarget } from '../../../test/fixtures/receipts'
import { makeReceiptState, renderWithProviders } from '../../../test/test-utils'
import type { ReceiptTarget } from '../../../types/receipts'

const pad = (value: number) => String(value).padStart(2, '0')
const now = new Date()
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

const loadedAccounts: Partial<ReceiptsState> = { bankAccountOptions: receiptBankAccountOptions, bankAccountOptionsStatus: 'success' }

function renderDialog(overrides: Partial<ReceiptsState> = loadedAccounts, invoice: ReceiptTarget = receiptTarget) {
  const onClose = vi.fn()
  const result = renderWithProviders(<ReceivePaymentDialog invoice={invoice} onClose={onClose} />, { preloadedState: makeReceiptState(overrides) })
  return { ...result, onClose }
}

const amountInput = () => screen.getByRole('spinbutton', { name: /Payment Amount/ })
const submit = () => screen.getByRole('button', { name: 'Post Payment' })

describe('ReceivePaymentDialog', () => {
  it('loads the deposit accounts and starts from the full balance, today, a transfer and the first account', () => {
    const { actions } = renderDialog()

    expect(actions).toContainEqual(loadReceiptBankAccountOptions())
    expect(screen.getByRole('dialog', { name: 'Receive Payment' })).toBeInTheDocument()
    expect(screen.getByText('AR-002471 · Jennifer Brown')).toBeInTheDocument()
    expect(screen.getByText('Invoice Total').nextElementSibling).toHaveTextContent('$29,350.00')
    expect(screen.getByText('Already Paid').nextElementSibling).toHaveTextContent('$1,850.00')
    expect(screen.getByText('Balance Due').nextElementSibling).toHaveTextContent('$27,500.00')

    expect(amountInput()).toHaveValue(27500)
    expect(screen.getByLabelText(/Payment Date/)).toHaveValue(today)
    expect(screen.getByRole('combobox', { name: 'Payment Method' })).toHaveTextContent('Bank Transfer')
    expect(screen.getByRole('combobox', { name: /Deposit To/ })).toHaveTextContent('Operating Checking — ****4521')
    expect(screen.getByText('This will fully settle the invoice.')).toBeInTheDocument()
  })

  it('shows what will be left after a partial payment', async () => {
    const { user } = renderDialog()
    await user.clear(amountInput())
    await user.type(amountInput(), '5000')
    expect(screen.getByText('Remaining balance after: $22,500.00')).toBeInTheDocument()
  })

  it.each([
    ['', 'Payment amount is required'],
    ['0', 'Amount must be greater than zero'],
    ['-5', 'Amount must be greater than zero'],
    ['10.555', 'Use at most two decimal places'],
    ['27500.01', 'Amount cannot exceed balance of $27,500.00'],
  ])('rejects an amount of "%s"', async (amount, message) => {
    const { actions, user } = renderDialog()
    await user.clear(amountInput())
    if (amount) await user.type(amountInput(), amount)
    await user.click(submit())

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(actions.some((action) => action.type === RECEIPT_ACTIONS.RECORD_AR_PAYMENT)).toBe(false)
  })

  it('posts the payment with the chosen method, account and reference', async () => {
    const { actions, user } = renderDialog()
    await user.clear(amountInput())
    await user.type(amountInput(), '1250.75')
    await user.click(screen.getByRole('combobox', { name: 'Payment Method' }))
    await user.click(screen.getByRole('option', { name: 'Check' }))
    await user.click(screen.getByRole('combobox', { name: /Deposit To/ }))
    await user.click(screen.getByRole('option', { name: 'Payroll' }))
    await user.type(screen.getByRole('textbox', { name: 'Reference / Cheque #' }), 'CHK-1042')
    await user.click(submit())

    expect(actions).toContainEqual(recordArPayment({
      arInvoiceId: '2471',
      values: { receiptDate: today, amount: '1250.75', paymentMethod: 'check', bankAccountId: '3', reference: 'CHK-1042' },
    }))
  })

  // Opening the dialog dispatches the accounts load, which sets the status back to loading; with no saga
  // running, these tests dispatch the response themselves, as the saga would
  it('requires a deposit account when there are none to choose', async () => {
    const { store, user } = renderDialog({})
    expect(screen.getByRole('combobox', { name: /Deposit To/ })).toHaveTextContent('Loading accounts…')
    act(() => { store.dispatch(loadReceiptBankAccountOptionsSuccess([])) })
    expect(screen.getByText('There are no active bank accounts to deposit to.')).toBeInTheDocument()
    await user.click(submit())
    expect(screen.getByText('Choose the account the payment is deposited to')).toBeInTheDocument()
  })

  it('shows when the accounts failed to load and retries', async () => {
    const { actions, store, user } = renderDialog({})
    act(() => { store.dispatch(loadReceiptBankAccountOptionsFailure('Bank accounts could not be loaded. Please try again.')) })
    expect(screen.getByText('Bank accounts could not be loaded. Please try again.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadReceiptBankAccountOptions().type)).toHaveLength(2)
  })

  it('shows the server banner, and hides a server field error once the field is edited', async () => {
    const { user } = renderDialog({ ...loadedAccounts, saveStatus: 'error', saveError: 'Invoice is already paid.', fieldErrors: { amount: 'Amount is too large.' } })
    expect(screen.getByText('Invoice is already paid.')).toBeInTheDocument()
    expect(screen.getByText('Amount is too large.')).toBeInTheDocument()

    await user.type(amountInput(), '1')
    expect(screen.queryByText('Amount is too large.')).not.toBeInTheDocument()
  })

  it('locks the form while posting', () => {
    renderDialog({ ...loadedAccounts, saveStatus: 'loading' })
    expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close receive payment form' })).toBeDisabled()
  })

  it('confirms a partial payment with the remaining balance, then closes', async () => {
    const { store, user, onClose } = renderDialog()
    await user.clear(amountInput())
    await user.type(amountInput(), '5000')
    await user.click(submit())
    act(() => { store.dispatch(recordArPaymentSuccess()) })

    const posted = screen.getByRole('dialog', { name: 'Payment Posted' })
    expect(within(posted).getByText('$5,000.00 received from')).toBeInTheDocument()
    expect(within(posted).getByText('AR-002471')).toBeInTheDocument()
    expect(within(posted).getByText('Bank Transfer')).toBeInTheDocument()
    expect(within(posted).getByText('Operating Checking — ****4521')).toBeInTheDocument()
    expect(within(posted).getByText('$22,500.00')).toHaveClass('text-amber')

    await user.click(within(posted).getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('confirms a payment that settles the invoice', async () => {
    const { store, user } = renderDialog()
    await user.click(submit())
    act(() => { store.dispatch(recordArPaymentSuccess()) })
    expect(screen.getByText('Fully settled')).toHaveClass('text-green')
  })

  it('closes from Cancel without posting', async () => {
    const { actions, user, onClose } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(actions).toEqual([loadReceiptBankAccountOptions()])
  })
})
