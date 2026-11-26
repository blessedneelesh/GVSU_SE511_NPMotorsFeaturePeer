import { act, screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BankPaymentsPage } from '../../../pages/BankPaymentsPage/BankPaymentsPage'
import { todayIsoDate } from '../../../pages/BankPaymentsPage/bankPaymentMetrics'
import {
  loadPayableVendorOptions,
  loadPaymentVendorBills,
  loadPaymentVendorBillsSuccess,
  recordMiscellaneousPayment,
  recordMiscellaneousPaymentSuccess,
  recordVendorPayment,
  recordVendorPaymentFailure,
  resetPayableSave,
} from '../../../redux/payables/payables.actions'
import { PAYABLE_ACTIONS } from '../../../redux/payables/payables.constants'
import { loadReceiptBankAccountOptions } from '../../../redux/receipts/receipts.actions'
import { overduePayable, partialPayable, payableVendorOptions } from '../../../test/fixtures/payables'
import { receiptBankAccountOptions } from '../../../test/fixtures/receipts'
import { makeVendorPaymentState, renderWithProviders } from '../../../test/test-utils'

// Vendors and accounts are preloaded; without a saga the mount-time reloads never answer.
// Operating Checking (id 1) holds $262,733.00 and Payroll (id 3) $48,250.00.
function renderPage() {
  return renderWithProviders(<BankPaymentsPage />, {
    preloadedState: makeVendorPaymentState(
      { vendorOptions: payableVendorOptions, vendorOptionsStatus: 'success' },
      { bankAccountOptions: receiptBankAccountOptions, bankAccountOptionsStatus: 'success' },
    ),
  })
}

const bankAccount = () => screen.getByRole('combobox', { name: /Bank Account/ })
const vendor = () => screen.getByRole('combobox', { name: /Vendor/ })
const bill = () => screen.getByRole('combobox', { name: /Against AP Bill/ })
const amountField = () => screen.getByRole('spinbutton', { name: /Amount/ })
const submit = () => screen.getByRole('button', { name: 'Post Payment' })
const RECORD_TYPES: readonly string[] = [PAYABLE_ACTIONS.RECORD_PAYMENT, PAYABLE_ACTIONS.RECORD_MISC_PAYMENT]
const posts = (actions: { type: string }[]) => actions.filter((action) => RECORD_TYPES.includes(action.type))

async function choose(user: UserEvent, combobox: HTMLElement, option: string | RegExp) {
  await user.click(combobox)
  await user.click(screen.getByRole('option', { name: option }))
}

// Picks AutoNation Wholesale and answers its bill lookup with one open bill ($47,320.00)
async function pickVendor(user: UserEvent, store: ReturnType<typeof renderPage>['store']) {
  await choose(user, vendor(), 'AutoNation Wholesale')
  act(() => { store.dispatch(loadPaymentVendorBillsSuccess({ vendorId: '4', bills: [partialPayable] })) })
}

describe('BankPaymentsPage', () => {
  it('renders the form with today and Vendor preselected, offers no Employee, and loads accounts and vendors', () => {
    const { actions } = renderPage()
    expect(screen.getByRole('heading', { name: 'Bank Payment' })).toBeInTheDocument()
    expect(actions).toEqual(expect.arrayContaining([resetPayableSave(), loadReceiptBankAccountOptions(), loadPayableVendorOptions()]))
    expect(screen.getByLabelText(/Date/)).toHaveValue(todayIsoDate())
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['vendor', 'other'])
    expect(screen.queryByRole('radio', { name: 'Employee' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Vendor' })).toBeChecked()
    expect(screen.queryByRole('combobox', { name: /Payment Purpose/ })).not.toBeInTheDocument()
  })

  it('shows the picked account\'s available balance and the balance after the payment', async () => {
    const { user } = renderPage()
    await choose(user, bankAccount(), 'Wells Fargo — Payroll')
    expect(screen.getByText(/Available balance/)).toHaveTextContent('Available balance: $48,250.00')
    await user.type(amountField(), '250')
    expect(screen.getByText(/New balance/)).toHaveTextContent('New balance: $48,000.00')
  })

  it('requires an account, a vendor and an amount before posting', async () => {
    const { actions, user } = renderPage()
    await user.click(submit())
    expect(screen.getByText('Select the account to pay from')).toBeInTheDocument()
    expect(screen.getByText('Select the vendor being paid')).toBeInTheDocument()
    expect(screen.getByText('Amount is required')).toBeInTheDocument()
    expect(posts(actions)).toEqual([])
  })

  it('posts a vendor payment to RecordVendorPayment against the picked bill, prefilled with its balance', async () => {
    const { actions, store, user } = renderPage()
    await choose(user, bankAccount(), /Operating Checking/)
    await pickVendor(user, store)
    expect(actions).toContainEqual(loadPaymentVendorBills('4'))
    expect(screen.getByText(/Open balance/)).toHaveTextContent('Open balance: $47,320.00')

    await user.click(submit())
    expect(screen.getByText('Select the bill this payment is for')).toBeInTheDocument()

    await choose(user, bill(), 'AP-2026-000011 — Balance: $47,320.00')
    expect(amountField()).toHaveValue(47320)
    await user.clear(amountField())
    await user.type(amountField(), '2000')
    await user.type(screen.getByRole('textbox', { name: /Reference/ }), 'CHK-1042')
    await user.click(submit())
    expect(posts(actions)).toEqual([recordVendorPayment({
      apBillId: '11',
      values: { paymentDate: todayIsoDate(), amount: '2000', paymentMethod: 'check', bankAccountId: '1', reference: 'CHK-1042' },
    })])
  })

  it('blocks an amount over the bill balance or the account balance', async () => {
    const { actions, store, user } = renderPage()
    await choose(user, bankAccount(), /Payroll/)
    await choose(user, vendor(), 'Honda Auto Parts')
    act(() => { store.dispatch(loadPaymentVendorBillsSuccess({ vendorId: '3', bills: [overduePayable] })) })
    await choose(user, bill(), /BILL-0020/)
    await user.clear(amountField())
    await user.type(amountField(), '12500')
    expect(screen.getByText('Amount exceeds the selected bill balance.')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Other Party' }))
    await user.clear(amountField())
    await user.type(amountField(), '50000')
    expect(screen.getByText('Amount exceeds the available account balance.')).toBeInTheDocument()
    await user.click(submit())
    expect(posts(actions)).toEqual([])
  })

  it('tells the user when the vendor has no open bills', async () => {
    const { store, user } = renderPage()
    await choose(user, vendor(), 'CarMax Auctions')
    act(() => { store.dispatch(loadPaymentVendorBillsSuccess({ vendorId: '1', bills: [] })) })
    expect(screen.getByText(/This vendor has no open bills/)).toBeInTheDocument()
    expect(bill()).toBeDisabled()
  })

  it('posts an other-party payment to RecordMiscellaneousPayment with payee, debit account and description', async () => {
    const { actions, user } = renderPage()
    await user.click(screen.getByRole('radio', { name: 'Other Party' }))
    expect(screen.queryByRole('combobox', { name: /Vendor/ })).not.toBeInTheDocument()

    await choose(user, bankAccount(), /Operating Checking/)
    await user.type(amountField(), '6000')
    await user.click(submit())
    expect(screen.getByText('Enter who the money was paid to')).toBeInTheDocument()
    expect(screen.getByText('Select the account to debit')).toBeInTheDocument()
    expect(posts(actions)).toEqual([])

    await user.type(screen.getByRole('textbox', { name: /Payee Name/ }), 'City Properties LLC')
    await choose(user, screen.getByRole('combobox', { name: /Payment Purpose/ }), '6200 — Rent Expense')
    await user.type(screen.getByRole('textbox', { name: /Description/ }), 'March rent')
    await choose(user, screen.getByRole('combobox', { name: /Payment Method/ }), 'Bank Transfer')
    await user.click(submit())
    expect(posts(actions)).toEqual([recordMiscellaneousPayment({
      payee: 'City Properties LLC',
      paymentCategory: 'Rent Expense',
      description: 'March rent',
      values: { paymentDate: todayIsoDate(), amount: '6000', paymentMethod: 'transfer', bankAccountId: '1', reference: '' },
    })])
  })

  it('shows the posted payment with the updated balance, and New Payment starts over', async () => {
    const { actions, store, user } = renderPage()
    await user.click(screen.getByRole('radio', { name: 'Other Party' }))
    await choose(user, bankAccount(), /Payroll/)
    await user.type(screen.getByRole('textbox', { name: /Payee Name/ }), 'City Properties LLC')
    await choose(user, screen.getByRole('combobox', { name: /Payment Purpose/ }), /Rent Expense/)
    await user.type(amountField(), '250')
    await user.click(submit())
    act(() => { store.dispatch(recordMiscellaneousPaymentSuccess()) })

    expect(screen.getByRole('heading', { name: 'Bank Payment Posted' })).toBeInTheDocument()
    expect(screen.getByText(/paid to/)).toHaveTextContent('$250.00 paid to City Properties LLC has been posted successfully.')
    expect(screen.getByText('Debit Account').nextElementSibling).toHaveTextContent('Rent Expense')
    expect(screen.getByText('Updated Balance').nextElementSibling).toHaveTextContent('$48,000.00')

    actions.length = 0
    await user.click(screen.getByRole('button', { name: 'New Payment' }))
    expect(actions).toContainEqual(resetPayableSave())
    expect(screen.getByRole('radio', { name: 'Vendor' })).toBeChecked()
    expect(amountField()).toHaveValue(null)
  })

  it('shows a server error as a banner and re-enables the form', () => {
    const { store } = renderPage()
    act(() => { store.dispatch(recordVendorPayment({ apBillId: '11', values: { paymentDate: '', amount: '1', paymentMethod: 'check', bankAccountId: '1', reference: '' } })) })
    expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()
    act(() => { store.dispatch(recordVendorPaymentFailure({ message: 'Bank account is inactive.', fieldErrors: {} })) })
    expect(screen.getByText('Bank account is inactive.')).toBeInTheDocument()
    expect(submit()).toBeEnabled()
  })
})
