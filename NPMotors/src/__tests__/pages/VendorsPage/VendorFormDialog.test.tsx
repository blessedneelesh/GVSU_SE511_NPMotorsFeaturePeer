import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VendorFormDialog } from '../../../pages/VendorsPage/VendorFormDialog'
import { createVendor } from '../../../redux/vendors/vendors.actions'
import type { VendorsState } from '../../../redux/vendors/vendors.reducer'
import { vendorFormValues } from '../../../test/fixtures/vendors'
import { makeVendorState, renderWithProviders } from '../../../test/test-utils'

// The dialog renders in a portal, so every query goes through screen
function renderDialog(overrides: Partial<VendorsState> = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<VendorFormDialog onClose={onClose} />, { preloadedState: makeVendorState(overrides) })
  return { ...result, onClose }
}

const field = (label: RegExp) => screen.getByRole('textbox', { name: label })

async function fillValidForm(user: UserEvent) {
  await user.type(field(/Vendor Name/), vendorFormValues.name)
  await user.type(field(/Address/), vendorFormValues.address)
  await user.type(field(/Contact Person/), vendorFormValues.contact)
  await user.type(field(/Phone/), vendorFormValues.phone)
  await user.type(field(/Email/), vendorFormValues.email)
}

const REQUIRED_MESSAGES = [
  'Vendor name is required',
  'Contact person is required',
  'Phone is required',
  'Email is required',
]

describe('VendorFormDialog', () => {
  it('renders the title, both sections and the defaults', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('New Vendor')).toBeInTheDocument()
    expect(screen.getByText('Add a supplier or service provider')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Company Information' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Contact Information' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Vendor Type/ })).toHaveTextContent('Vehicle')
    expect(screen.getByRole('combobox', { name: /Status/ })).toHaveTextContent('Active')
    expect(field(/Address/)).not.toBeRequired()
    expect(screen.getByRole('button', { name: 'Save Vendor' })).toBeEnabled()
  })

  it('shows every required message for an empty form and does not save', async () => {
    const { actions, user } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Save Vendor' }))

    for (const message of REQUIRED_MESSAGES) expect(screen.getByText(message)).toBeInTheDocument()
    expect(actions).toHaveLength(0)
  })

  it('rejects an invalid email', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.clear(field(/Email/))
    await user.type(field(/Email/), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save Vendor' }))

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(actions).toHaveLength(0)
  })

  it('clears a field error as soon as the field is edited', async () => {
    const { user } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Save Vendor' }))
    expect(screen.getByText('Vendor name is required')).toBeInTheDocument()

    await user.type(field(/Vendor Name/), 'A')
    expect(screen.queryByText('Vendor name is required')).not.toBeInTheDocument()
    expect(screen.getByText('Contact person is required')).toBeInTheDocument()
  })

  it('dispatches createVendor with the typed values', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Save Vendor' }))
    expect(actions).toEqual([createVendor(vendorFormValues)])
  })

  it('sends the chosen type and status', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(screen.getByRole('combobox', { name: /Vendor Type/ }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Vehicle', 'Parts', 'Service'])
    await user.click(screen.getByRole('option', { name: 'Service' }))
    await user.click(screen.getByRole('combobox', { name: /Status/ }))
    await user.click(screen.getByRole('option', { name: 'Inactive' }))
    await user.click(screen.getByRole('button', { name: 'Save Vendor' }))
    expect(actions).toEqual([createVendor({ ...vendorFormValues, type: 'service', status: 'Inactive' })])
  })

  it('locks the form while saving', async () => {
    const { onClose, user } = renderDialog({ saveStatus: 'loading' })

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close new vendor form' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Company Information' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Contact Information' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows server errors and hides a field error once that field is edited', async () => {
    const { user } = renderDialog({
      saveStatus: 'error',
      saveError: 'Something went wrong while saving.',
      fieldErrors: { name: 'The Name field is required.', phone: 'Phone is too long' },
    })

    expect(screen.getByText('Something went wrong while saving.')).toBeInTheDocument()
    expect(screen.getByText('The Name field is required.')).toBeInTheDocument()

    await user.type(field(/Vendor Name/), 'x')
    expect(screen.queryByText('The Name field is required.')).not.toBeInTheDocument()
    expect(screen.getByText('Phone is too long')).toBeInTheDocument()
  })

  it('shows server errors on the dropdowns and hides them once a new option is chosen', async () => {
    const { user } = renderDialog({ saveStatus: 'error', fieldErrors: { type: 'Bad vendor type', status: 'Bad status' } })
    expect(screen.getByText('Bad vendor type')).toBeInTheDocument()
    expect(screen.getByText('Bad status')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /Vendor Type/ }))
    await user.click(screen.getByRole('option', { name: 'Parts' }))
    expect(screen.queryByText('Bad vendor type')).not.toBeInTheDocument()
    expect(screen.getByText('Bad status')).toBeInTheDocument()
  })

  it.each([
    ['Cancel', 'Cancel'],
    ['the close button', 'Close new vendor form'],
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
