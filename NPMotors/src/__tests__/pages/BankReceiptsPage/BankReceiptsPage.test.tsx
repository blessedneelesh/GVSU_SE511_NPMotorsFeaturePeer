import { act, screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BankReceiptsPage } from '../../../pages/BankReceiptsPage/BankReceiptsPage'
import { todayIsoDate } from '../../../pages/BankReceiptsPage/bankReceiptMetrics'
import {
  loadReceiptBankAccountOptions,
  loadReceiptCustomerInvoices,
  loadReceiptCustomerInvoicesSuccess,
  recordArPayment,
  recordArPaymentFailure,
  recordMiscReceipt,
  recordMiscReceiptSuccess,
  resetReceiptSave,
} from '../../../redux/receipts/receipts.actions'
import { RECEIPT_ACTIONS } from '../../../redux/receipts/receipts.constants'
import type { ReceiptsState } from '../../../redux/receipts/receipts.reducer'
import { loadReceivableCustomerOptions } from '../../../redux/receivables/receivables.actions'
import { receiptBankAccountOptions } from '../../../test/fixtures/receipts'
import { partialReceivable, receivableCustomerOptions, recentOverdueReceivable } from '../../../test/fixtures/receivables'
import { makeReceiptState, renderWithProviders } from '../../../test/test-utils'

// Accounts and customers are preloaded unless a test overrides them; without a saga the mount-time reloads never answer
function renderPage(overrides: Partial<ReceiptsState> = {}) {
  return renderWithProviders(<BankReceiptsPage />, {
    preloadedState: makeReceiptState(
      { bankAccountOptions: receiptBankAccountOptions, bankAccountOptionsStatus: 'success', ...overrides },
      { customerOptions: receivableCustomerOptions, customerOptionsStatus: 'success' },
    ),
  })
}

const bankAccount = () => screen.getByRole('combobox', { name: /Bank Account/ })
const customer = () => screen.getByRole('combobox', { name: /Customer/ })
const invoice = () => screen.getByRole('combobox', { name: /Against Invoice/ })
const amountField = () => screen.getByRole('spinbutton', { name: /Amount/ })
const submit = () => screen.getByRole('button', { name: 'Post Receipt' })
const RECORD_TYPES: readonly string[] = [RECEIPT_ACTIONS.RECORD_AR_PAYMENT, RECEIPT_ACTIONS.RECORD_MISC_RECEIPT]
const posts = (actions: { type: string }[]) => actions.filter((action) => RECORD_TYPES.includes(action.type))

async function choose(user: UserEvent, combobox: HTMLElement, option: string | RegExp) {
  await user.click(combobox)
  await user.click(screen.getByRole('option', { name: option }))
}

// Picks Jennifer Brown and answers her invoice lookup with two open invoices
async function pickCustomer(user: UserEvent, store: ReturnType<typeof renderPage>['store']) {
  await choose(user, customer(), 'Jennifer Brown')
  act(() => { store.dispatch(loadReceiptCustomerInvoicesSuccess({ customerId: '6', invoices: [recentOverdueReceivable, partialReceivable] })) })
}

describe('BankReceiptsPage', () => {
  it('renders the form with today and Customer preselected, and loads accounts and customers', () => {
    const { actions } = renderPage()
    expect(screen.getByRole('heading', { name: 'Bank Receipt' })).toBeInTheDocument()
    expect(actions).toEqual(expect.arrayContaining([resetReceiptSave(), loadReceiptBankAccountOptions(), loadReceivableCustomerOptions()]))
    expect(screen.getByLabelText(/Date/)).toHaveValue(todayIsoDate())
    expect(screen.getByRole('radio', { name: 'Customer' })).toBeChecked()
    expect(customer()).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Against Invoice/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Description/ })).not.toBeInTheDocument()
  })

  it('shows the picked account\'s current balance', async () => {
    const { user } = renderPage()
    await choose(user, bankAccount(), 'Chase — Operating Checking (****4521)')
    expect(screen.getByText(/Current balance/)).toHaveTextContent('Current balance: $262,733.00')
  })

  it('requires an account, a customer and an amount before posting', async () => {
    const { actions, user } = renderPage()
    await user.click(submit())
    expect(screen.getByText('Select the account the money is deposited to')).toBeInTheDocument()
    expect(screen.getByText('Select the customer who paid')).toBeInTheDocument()
    expect(screen.getByText('Amount is required')).toBeInTheDocument()
    expect(posts(actions)).toEqual([])
  })

  it('loads the picked customer\'s open invoices and requires one', async () => {
    const { actions, store, user } = renderPage()
    await choose(user, bankAccount(), /Operating Checking/)
    await pickCustomer(user, store)
    expect(actions).toContainEqual(loadReceiptCustomerInvoices('6'))
    expect(screen.getByText(/Open balance/)).toHaveTextContent('Open balance: $46,190.00')

    await user.type(amountField(), '100')
    await user.click(submit())
    expect(screen.getByText('Select the invoice this payment is for')).toBeInTheDocument()
    expect(posts(actions)).toEqual([])
  })

  it('posts a customer receipt to RecordArPayment against the picked invoice, prefilled with its balance', async () => {
    const { actions, store, user } = renderPage()
    await choose(user, bankAccount(), /Operating Checking/)
    await pickCustomer(user, store)
    await choose(user, invoice(), 'AR-002471 — Balance: $27,500.00')
    expect(amountField()).toHaveValue(27500)

    await user.clear(amountField())
    await user.type(amountField(), '5000')
    await user.type(screen.getByRole('textbox', { name: /Reference/ }), 'CHK-1042')
    await user.click(submit())
    expect(posts(actions)).toEqual([recordArPayment({
      arInvoiceId: '2471',
      values: { receiptDate: todayIsoDate(), amount: '5000', paymentMethod: 'check', bankAccountId: '1', reference: 'CHK-1042' },
    })])
  })

  it('blocks an amount over the invoice balance', async () => {
    const { actions, store, user } = renderPage()
    await choose(user, bankAccount(), /Operating Checking/)
    await pickCustomer(user, store)
    await choose(user, invoice(), /AR-003975/)
    await user.clear(amountField())
    await user.type(amountField(), '20000')
    expect(screen.getByText('Amount exceeds the selected invoice balance.')).toBeInTheDocument()
    await user.click(submit())
    expect(posts(actions)).toEqual([])
  })

  it('tells the user when the customer has no open invoices', async () => {
    const { store, user } = renderPage()
    await choose(user, customer(), 'John Smith')
    act(() => { store.dispatch(loadReceiptCustomerInvoicesSuccess({ customerId: '1', invoices: [] })) })
    expect(screen.getByText(/This customer has no open invoices/)).toBeInTheDocument()
    expect(invoice()).toBeDisabled()
  })

  it('posts an other-party receipt to RecordMiscReceipt with the payer and description', async () => {
    const { actions, user } = renderPage()
    await user.click(screen.getByRole('radio', { name: 'Other Party' }))
    expect(screen.queryByRole('combobox', { name: /Customer/ })).not.toBeInTheDocument()

    await choose(user, bankAccount(), /Payroll/)
    await user.type(amountField(), '250.75')
    await user.click(submit())
    expect(screen.getByText('Enter who the money was received from')).toBeInTheDocument()
    expect(posts(actions)).toEqual([])

    await user.type(screen.getByRole('textbox', { name: /Party Name/ }), 'Ally Bank')
    await user.type(screen.getByRole('textbox', { name: /Description/ }), 'Interest')
    await choose(user, screen.getByRole('combobox', { name: /Payment Method/ }), 'Bank Transfer')
    await user.click(submit())
    expect(posts(actions)).toEqual([recordMiscReceipt({
      payer: 'Ally Bank',
      description: 'Interest',
      values: { receiptDate: todayIsoDate(), amount: '250.75', paymentMethod: 'transfer', bankAccountId: '3', reference: '' },
    })])
  })

  it('shows the posted receipt, and New Receipt starts over', async () => {
    const { actions, store, user } = renderPage()
    await user.click(screen.getByRole('radio', { name: 'Other Party' }))
    await choose(user, bankAccount(), /Payroll/)
    await user.type(screen.getByRole('textbox', { name: /Party Name/ }), 'Ally Bank')
    await user.type(amountField(), '250.75')
    await user.click(submit())
    act(() => { store.dispatch(recordMiscReceiptSuccess()) })

    expect(screen.getByRole('heading', { name: 'Bank Receipt Posted' })).toBeInTheDocument()
    expect(screen.getByText(/received from/)).toHaveTextContent('$250.75 received from Ally Bank has been posted successfully.')
    expect(screen.getByText('Deposited To').nextElementSibling).toHaveTextContent('Wells Fargo — Payroll')

    actions.length = 0
    await user.click(screen.getByRole('button', { name: 'New Receipt' }))
    expect(actions).toContainEqual(resetReceiptSave())
    // A fresh form: back on Customer, nothing entered
    expect(screen.getByRole('radio', { name: 'Customer' })).toBeChecked()
    expect(amountField()).toHaveValue(null)
  })

  it('shows a server error as a banner', () => {
    const { store } = renderPage()
    act(() => { store.dispatch(recordArPaymentFailure({ message: 'Bank account is inactive.', fieldErrors: {} })) })
    expect(screen.getByText('Bank account is inactive.')).toBeInTheDocument()
  })

  it('disables the form while posting', async () => {
    const { store } = renderPage()
    act(() => { store.dispatch(recordArPayment({ arInvoiceId: '2471', values: { receiptDate: '', amount: '1', paymentMethod: 'check', bankAccountId: '1', reference: '' } })) })
    expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()
    act(() => { store.dispatch(recordArPaymentFailure({ message: 'Nope', fieldErrors: {} })) })
    expect(submit()).toBeEnabled()
  })
})
