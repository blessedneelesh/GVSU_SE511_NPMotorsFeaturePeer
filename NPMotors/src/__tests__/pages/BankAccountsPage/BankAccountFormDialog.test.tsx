import { act, screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BankAccountFormDialog } from '../../../pages/BankAccountsPage/BankAccountFormDialog'
import { createBankAccount, loadBankOptions, loadBankOptionsFailure } from '../../../redux/bankAccounts/bankAccounts.actions'
import type { BankAccountsState } from '../../../redux/bankAccounts/bankAccounts.reducer'
import { bankOptions, formValues } from '../../../test/fixtures/bankAccounts'
import { makeBankAccountState, renderWithProviders } from '../../../test/test-utils'

// The dialog renders in a portal, so every query goes through screen. Banks are preloaded unless a test overrides them.
function renderDialog(overrides: Partial<BankAccountsState> = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<BankAccountFormDialog onClose={onClose} />, {
    preloadedState: makeBankAccountState({ bankOptions, ...overrides }),
  })
  return { ...result, onClose }
}

const field = (label: RegExp) => screen.getByRole('textbox', { name: label })
const balanceField = () => screen.getByRole('spinbutton', { name: /Opening Balance/ })
const submit = () => screen.getByRole('button', { name: 'Add Account' })
// 'Select a bank' is also the bank dropdown's placeholder, so match only the field's validation message
const bankError = () => screen.queryByText('Select a bank', { selector: '.fui-Field__validationMessage' })
// Every action but the bank list load the dialog dispatches on mount
const saves = (actions: { type: string }[]) => actions.filter((action) => action.type !== loadBankOptions().type)

async function fillValidForm(user: UserEvent) {
  await user.click(screen.getByRole('combobox', { name: /Bank Name/ }))
  await user.click(screen.getByRole('option', { name: 'Chase Bank' }))
  await user.type(field(/Account Name/), formValues.name)
  await user.type(field(/Account Number/), formValues.accountNumber)
  await user.type(field(/Routing Number/), formValues.routing)
  await user.type(balanceField(), formValues.openingBalance)
}

describe('BankAccountFormDialog', () => {
  it('renders the title, the fields and the defaults, and loads the banks', () => {
    const { actions } = renderDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Add Bank Account')).toBeInTheDocument()
    expect(actions).toEqual([loadBankOptions()])

    expect(screen.getByRole('combobox', { name: /Bank Name/ })).toHaveTextContent('Select a bank')
    expect(screen.getByRole('combobox', { name: /Account Type/ })).toHaveTextContent('Checking')
    expect(field(/Account Name/)).toHaveValue('')
    expect(field(/Account Number/)).toHaveAttribute('maxlength', '50')
    expect(field(/Routing Number/)).toHaveAttribute('maxlength', '20')
    expect(balanceField()).toHaveAttribute('min', '0')
    expect(submit()).toBeEnabled()
  })

  it('offers the loaded banks and the account types the API accepts', async () => {
    const { user } = renderDialog()
    await user.click(screen.getByRole('combobox', { name: /Bank Name/ }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Bank of America', 'Chase Bank'])
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('combobox', { name: /Account Type/ }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Checking', 'Savings', 'Other'])
  })

  it('disables the bank list while the first load is in flight', () => {
    renderDialog({ bankOptions: [] })
    const bank = screen.getByRole('combobox', { name: /Bank Name/ })
    expect(bank).toBeDisabled()
    expect(bank).toHaveTextContent('Loading banks…')
  })

  it('warns when the banks fail to load and retries', async () => {
    const { store, actions, user } = renderDialog({ bankOptions: [] })
    act(() => { store.dispatch(loadBankOptionsFailure('Banks could not be loaded. Please try again.')) })

    expect(screen.getByText('Banks could not be loaded. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Bank Name/ })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadBankOptions().type)).toHaveLength(2)
  })

  it('shows every required message for an empty form and does not save', async () => {
    const { actions, user } = renderDialog()
    await user.click(submit())

    expect(bankError()).toBeInTheDocument()
    expect(screen.getByText('Account name is required')).toBeInTheDocument()
    expect(saves(actions)).toHaveLength(0)
  })

  it('treats a whitespace-only account name as empty', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.clear(field(/Account Name/))
    await user.type(field(/Account Name/), '   ')
    await user.click(submit())

    expect(screen.getByText('Account name is required')).toBeInTheDocument()
    expect(saves(actions)).toHaveLength(0)
  })

  it('rejects an opening balance above the API limit', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.clear(balanceField())
    await user.type(balanceField(), '1000000000000')
    await user.click(submit())

    expect(screen.getByText('Opening balance is too large')).toBeInTheDocument()
    expect(saves(actions)).toHaveLength(0)
  })

  it('rejects a negative opening balance', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.clear(balanceField())
    await user.type(balanceField(), '-5')
    await user.click(submit())

    expect(screen.getByText('Opening balance cannot be negative')).toBeInTheDocument()
    expect(saves(actions)).toHaveLength(0)
  })

  it('clears a field error as soon as the field is edited', async () => {
    const { user } = renderDialog()
    await user.click(submit())
    expect(screen.getByText('Account name is required')).toBeInTheDocument()

    await user.type(field(/Account Name/), 'A')
    expect(screen.queryByText('Account name is required')).not.toBeInTheDocument()
    expect(bankError()).toBeInTheDocument()
  })

  it('dispatches createBankAccount with the typed values', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(submit())
    expect(saves(actions)).toEqual([createBankAccount(formValues)])
  })

  it('leaves the optional fields empty when they are not filled in', async () => {
    const { actions, user } = renderDialog()
    await user.click(screen.getByRole('combobox', { name: /Bank Name/ }))
    await user.click(screen.getByRole('option', { name: 'Bank of America' }))
    await user.type(field(/Account Name/), 'Reserve')
    await user.click(submit())

    expect(saves(actions)).toEqual([createBankAccount({
      bankId: '2', name: 'Reserve', type: 'Checking', accountNumber: '', routing: '', openingBalance: '',
    })])
  })

  it('sends the chosen account type', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(screen.getByRole('combobox', { name: /Account Type/ }))
    await user.click(screen.getByRole('option', { name: 'Savings' }))
    await user.click(submit())
    expect(saves(actions)).toEqual([createBankAccount({ ...formValues, type: 'Savings' })])
  })

  it('locks the form while saving', async () => {
    const { onClose, user } = renderDialog({ saveStatus: 'loading' })

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close add bank account form' })).toBeDisabled()
    expect(screen.getByRole('dialog').querySelector('fieldset')).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows server errors and hides a field error once that field is edited', async () => {
    const { user } = renderDialog({
      saveStatus: 'error',
      saveError: 'Something went wrong while saving.',
      fieldErrors: { name: 'The Name field is required.', bankId: 'A bank account must belong to a bank.' },
    })

    expect(screen.getByText('Something went wrong while saving.')).toBeInTheDocument()
    expect(screen.getByText('The Name field is required.')).toBeInTheDocument()

    await user.type(field(/Account Name/), 'x')
    expect(screen.queryByText('The Name field is required.')).not.toBeInTheDocument()
    expect(screen.getByText('A bank account must belong to a bank.')).toBeInTheDocument()
  })

  it.each([
    ['Cancel', 'Cancel'],
    ['the close button', 'Close add bank account form'],
  ])('calls onClose from %s', async (_, name) => {
    const { onClose, user } = renderDialog()
    await user.click(screen.getByRole('button', { name }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape when not saving', async () => {
    const { onClose, user } = renderDialog()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
