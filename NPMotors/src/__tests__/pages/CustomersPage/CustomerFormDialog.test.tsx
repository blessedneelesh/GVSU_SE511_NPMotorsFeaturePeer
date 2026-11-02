import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomerFormDialog } from '../../../pages/CustomersPage/CustomerFormDialog'
import { createCustomer } from '../../../redux/customers/customers.actions'
import { formValues } from '../../../test/fixtures/customers'
import { makeState, renderWithProviders } from '../../../test/test-utils'
import type { CustomersState } from '../../../redux/customers/customers.reducer'

// The dialog renders in a portal, so every query goes through screen
function renderDialog(overrides: Partial<CustomersState> = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<CustomerFormDialog onClose={onClose} />, { preloadedState: makeState(overrides) })
  return { ...result, onClose }
}

const field = (label: RegExp) => screen.getByRole('textbox', { name: label })

async function fillValidForm(user: UserEvent) {
  await user.type(field(/First Name/), formValues.firstName)
  await user.type(field(/Last Name/), formValues.lastName)
  await user.type(screen.getByRole('textbox', { name: /Phone/ }), formValues.phone)
  await user.type(field(/Email/), formValues.email)
  await user.type(field(/Street Address/), formValues.address)
  await user.type(field(/City/), formValues.city)
  await user.type(field(/ZIP/), formValues.zip)
}

const REQUIRED_MESSAGES = [
  'First name is required',
  'Last name is required',
  'Phone is required',
  'Email is required',
  'Street address is required',
  'City is required',
  'ZIP code is required',
]

describe('CustomerFormDialog', () => {
  it('renders the title, both sections and the defaults', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('New Customer')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Customer Information' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Billing Address' })).toBeInTheDocument()
    expect(field(/State/)).toHaveValue('TX')
    expect(screen.getByRole('combobox', { name: /Status/ })).toHaveTextContent('Active')
    expect(screen.getByRole('button', { name: 'Save Customer' })).toBeEnabled()
  })

  it('shows every required message for an empty form and does not save', async () => {
    const { actions, user } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Save Customer' }))

    for (const message of REQUIRED_MESSAGES) expect(screen.getByText(message)).toBeInTheDocument()
    expect(actions).toHaveLength(0)
  })

  it('requires the state once it is cleared', async () => {
    const { user } = renderDialog()
    await user.clear(field(/State/))
    await user.click(screen.getByRole('button', { name: 'Save Customer' }))
    expect(screen.getByText('State is required')).toBeInTheDocument()
  })

  it('rejects an invalid email', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.clear(field(/Email/))
    await user.type(field(/Email/), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save Customer' }))

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(actions).toHaveLength(0)
  })

  it('clears a field error as soon as the field is edited', async () => {
    const { user } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Save Customer' }))
    expect(screen.getByText('First name is required')).toBeInTheDocument()

    await user.type(field(/First Name/), 'A')
    expect(screen.queryByText('First name is required')).not.toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
  })

  it('dispatches createCustomer with the typed values', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Save Customer' }))
    expect(actions).toEqual([createCustomer(formValues)])
  })

  it('sends the chosen status', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(screen.getByRole('combobox', { name: /Status/ }))
    await user.click(screen.getByRole('option', { name: 'Inactive' }))
    await user.click(screen.getByRole('button', { name: 'Save Customer' }))
    expect(actions).toEqual([createCustomer({ ...formValues, status: 'Inactive' })])
  })

  it('locks the form while saving', async () => {
    const { onClose, user } = renderDialog({ saveStatus: 'loading' })

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close new customer form' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Customer Information' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Billing Address' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows server errors and hides a field error once that field is edited', async () => {
    const { user } = renderDialog({
      saveStatus: 'error',
      saveError: 'Something went wrong while saving.',
      fieldErrors: { email: 'Email already exists', phone: 'Phone is too long' },
    })

    expect(screen.getByText('Something went wrong while saving.')).toBeInTheDocument()
    expect(screen.getByText('Email already exists')).toBeInTheDocument()

    await user.type(field(/Email/), 'x')
    expect(screen.queryByText('Email already exists')).not.toBeInTheDocument()
    expect(screen.getByText('Phone is too long')).toBeInTheDocument()
  })

  it.each([
    ['Cancel', 'Cancel'],
    ['the close button', 'Close new customer form'],
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
