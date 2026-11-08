import { act, screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TransferForm } from '../../../pages/TransfersPage/TransferForm'
import { todayIsoDate } from '../../../pages/TransfersPage/transferMetrics'
import {
  createTransfer,
  createTransferSuccess,
  loadTransferAccountOptions,
  loadTransferAccountOptionsFailure,
} from '../../../redux/transfers/transfers.actions'
import type { TransfersState } from '../../../redux/transfers/transfers.reducer'
import { accountOptions } from '../../../test/fixtures/transfers'
import { makeTransferState, renderWithProviders } from '../../../test/test-utils'

// Accounts are preloaded unless a test overrides them; without a saga the mount-time reload never answers
function renderForm(overrides: Partial<TransfersState> = {}) {
  return renderWithProviders(<TransferForm />, {
    preloadedState: makeTransferState({ accountOptions, accountOptionsStatus: 'success', ...overrides }),
  })
}

const fromAccount = () => screen.getByRole('combobox', { name: /From Account/ })
const toAccount = () => screen.getByRole('combobox', { name: /To Account/ })
const dateField = () => screen.getByLabelText(/Transfer Date/)
const amountField = () => screen.getByRole('spinbutton', { name: /Amount/ })
const descriptionField = () => screen.getByRole('textbox', { name: /Description/ })
const submit = () => screen.getByRole('button', { name: 'Post Transfer' })
const preview = () => within(screen.getByRole('region', { name: 'Transfer preview' }))
// Every action but the account reload the form dispatches on mount
const posts = (actions: { type: string }[]) => actions.filter((action) => action.type !== loadTransferAccountOptions().type)

async function choose(user: UserEvent, combobox: HTMLElement, option: string) {
  await user.click(combobox)
  await user.click(screen.getByRole('option', { name: option }))
}

describe('TransferForm', () => {
  it('renders the fields with the first two accounts and today preselected, and loads the accounts', () => {
    const { actions } = renderForm()
    expect(screen.getByRole('heading', { name: 'New Transfer' })).toBeInTheDocument()
    expect(screen.getByText('Unreconciled')).toBeInTheDocument()
    expect(actions).toEqual([loadTransferAccountOptions()])

    expect(fromAccount()).toHaveTextContent('Chase Bank — Operating Checking')
    expect(toAccount()).toHaveTextContent('Chase Bank — Payroll Account')
    expect(dateField()).toHaveValue(todayIsoDate())
    expect(amountField()).toHaveValue(null)
    expect(amountField()).toHaveAttribute('min', '0')
    expect(descriptionField()).toHaveValue('')
    expect(descriptionField()).toHaveAttribute('maxlength', '500')
    expect(submit()).toBeEnabled()
  })

  it('shows the available balance of the source and the current balance of the destination', () => {
    renderForm()
    expect(screen.getByText(/Available/)).toHaveTextContent('Available: $262,733.00')
    expect(screen.getByText(/Current balance/)).toHaveTextContent('Current balance: $135,000.00')
  })

  it('offers every loaded account, labelled with its bank', async () => {
    const { user } = renderForm()
    await user.click(fromAccount())
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Chase Bank — Operating Checking',
      'Chase Bank — Payroll Account',
      'Tax Reserve',
    ])
  })

  it('disables the account lists and Post while the first load is in flight', () => {
    renderForm({ accountOptions: [], accountOptionsStatus: 'loading' })
    expect(fromAccount()).toBeDisabled()
    expect(fromAccount()).toHaveTextContent('Loading accounts…')
    expect(toAccount()).toBeDisabled()
    expect(submit()).toBeDisabled()
  })

  it('warns when the accounts fail to load and retries', async () => {
    const { store, actions, user } = renderForm({ accountOptions: [] })
    act(() => { store.dispatch(loadTransferAccountOptionsFailure('Bank accounts could not be loaded. Please try again.')) })

    expect(screen.getByText('Bank accounts could not be loaded. Please try again.')).toBeInTheDocument()
    expect(fromAccount()).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadTransferAccountOptions().type)).toHaveLength(2)
  })

  it('previews the outgoing and incoming legs as the amount is typed', async () => {
    const { user } = renderForm()
    expect(preview().getByText('−$0.00')).toBeInTheDocument()
    expect(preview().getByText('+$0.00')).toBeInTheDocument()

    await user.type(amountField(), '5000')
    expect(preview().getByText('Operating Checking')).toBeInTheDocument()
    expect(preview().getByText('−$5,000.00')).toBeInTheDocument()
    expect(preview().getByText('Payroll Account')).toBeInTheDocument()
    expect(preview().getByText('+$5,000.00')).toBeInTheDocument()
  })

  it('warns as soon as both accounts are the same, and does not post', async () => {
    const { actions, user } = renderForm()
    await choose(user, toAccount(), 'Chase Bank — Operating Checking')
    expect(screen.getByText('Choose a different destination account.')).toBeInTheDocument()

    await user.type(amountField(), '100')
    await user.click(submit())
    expect(posts(actions)).toHaveLength(0)
  })

  it('warns as soon as the amount exceeds the source balance, and does not post', async () => {
    const { actions, user } = renderForm()
    await user.type(amountField(), '300000')
    expect(screen.getByText('Transfer amount exceeds the source account balance.')).toBeInTheDocument()

    await user.click(submit())
    expect(posts(actions)).toHaveLength(0)
  })

  it('checks the balance of the newly chosen source account', async () => {
    const { user } = renderForm()
    await user.type(amountField(), '200000')
    expect(screen.queryByText('Transfer amount exceeds the source account balance.')).not.toBeInTheDocument()

    await choose(user, fromAccount(), 'Chase Bank — Payroll Account')
    await choose(user, toAccount(), 'Tax Reserve')
    expect(screen.getByText('Transfer amount exceeds the source account balance.')).toBeInTheDocument()
  })

  it.each([
    ['empty', '', 'Amount is required'],
    ['zero', '0', 'Enter an amount greater than zero'],
    ['more than two decimals', '10.555', 'Use at most two decimal places'],
  ])('rejects an amount that is %s', async (_, amount, message) => {
    const { actions, user } = renderForm()
    if (amount) await user.type(amountField(), amount)
    await user.click(submit())

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(posts(actions)).toHaveLength(0)
  })

  it('requires a transfer date', async () => {
    const { actions, user } = renderForm()
    await user.clear(dateField())
    await user.type(amountField(), '100')
    await user.click(submit())

    expect(screen.getByText('Transfer date is required')).toBeInTheDocument()
    expect(posts(actions)).toHaveLength(0)
  })

  it('clears a field error as soon as the field is edited', async () => {
    const { user } = renderForm()
    await user.click(submit())
    expect(screen.getByText('Amount is required')).toBeInTheDocument()

    await user.type(amountField(), '1')
    expect(screen.queryByText('Amount is required')).not.toBeInTheDocument()
  })

  it('dispatches createTransfer with the default accounts and the typed values', async () => {
    const { actions, user } = renderForm()
    await user.type(amountField(), '5000')
    await user.type(descriptionField(), 'Fund payroll account')
    await user.click(submit())

    expect(posts(actions)).toEqual([createTransfer({
      sourceAccountId: '1',
      destinationAccountId: '2',
      date: todayIsoDate(),
      amount: '5000',
      description: 'Fund payroll account',
    })])
  })

  it('sends the chosen accounts and date', async () => {
    const { actions, user } = renderForm()
    await choose(user, fromAccount(), 'Chase Bank — Payroll Account')
    await choose(user, toAccount(), 'Tax Reserve')
    await user.clear(dateField())
    await user.type(dateField(), '2024-03-31')
    await user.type(amountField(), '250.75')
    await user.click(submit())

    expect(posts(actions)).toEqual([createTransfer({
      sourceAccountId: '2',
      destinationAccountId: '5',
      date: '2024-03-31',
      amount: '250.75',
      description: '',
    })])
  })

  it('locks the form while posting', () => {
    renderForm({ saveStatus: 'loading' })
    expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()
    expect(amountField().closest('fieldset')).toBeDisabled()
  })

  it('shows server errors and hides a field error once that field is edited', async () => {
    const { user } = renderForm({
      saveStatus: 'error',
      saveError: 'Insufficient funds in the source account.',
      fieldErrors: { amount: 'The amount must be greater than zero.', date: 'The date is invalid.' },
    })

    expect(screen.getByText('Insufficient funds in the source account.')).toBeInTheDocument()
    expect(screen.getByText('The amount must be greater than zero.')).toBeInTheDocument()

    await user.type(amountField(), '5')
    expect(screen.queryByText('The amount must be greater than zero.')).not.toBeInTheDocument()
    expect(screen.getByText('The date is invalid.')).toBeInTheDocument()
  })

  it('clears the amount and description after a successful post, keeping the accounts and date', async () => {
    const { store, user } = renderForm()
    await choose(user, toAccount(), 'Tax Reserve')
    await user.type(amountField(), '5000')
    await user.type(descriptionField(), 'Fund tax reserve')
    act(() => { store.dispatch(createTransferSuccess()) })

    expect(amountField()).toHaveValue(null)
    expect(descriptionField()).toHaveValue('')
    expect(fromAccount()).toHaveTextContent('Chase Bank — Operating Checking')
    expect(toAccount()).toHaveTextContent('Tax Reserve')
    expect(dateField()).toHaveValue(todayIsoDate())
  })
})
