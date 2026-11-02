import { act, screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VehicleFormDialog } from '../../../pages/VehiclesPage/VehicleFormDialog'
import {
  createVehicle,
  loadVehicleVendorOptions,
  loadVehicleVendorOptionsFailure,
  loadVehicleVendorOptionsSuccess,
} from '../../../redux/vehicles/vehicles.actions'
import { VEHICLE_ACTIONS } from '../../../redux/vehicles/vehicles.constants'
import type { VehiclesState } from '../../../redux/vehicles/vehicles.reducer'
import { vehicleFormValues, vehicleVendorOptions } from '../../../test/fixtures/vehicles'
import { makeVehicleState, renderWithProviders } from '../../../test/test-utils'

// The dialog loads the vendors on mount, which sets vendorOptionsStatus to 'loading'. Without a saga nothing
// answers it, so the helper dispatches the vendors itself, as the saga would. The dialog renders in a portal,
// so every query goes through screen.
function renderDialog(overrides: Partial<VehiclesState> = {}, { vendors = true } = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<VehicleFormDialog onClose={onClose} />, { preloadedState: makeVehicleState(overrides) })
  if (vendors) act(() => { result.store.dispatch(loadVehicleVendorOptionsSuccess(vehicleVendorOptions)) })
  return { ...result, onClose }
}

// Same local YYYY-MM-DD the dialog uses for its default purchase date
const today = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
const MAX_YEAR = new Date().getFullYear() + 1

const textbox = (label: RegExp) => screen.getByRole('textbox', { name: label })
// type="number" inputs have the spinbutton role
const numberField = (label: RegExp) => screen.getByRole('spinbutton', { name: label })
const dateField = () => screen.getByLabelText(/Purchase Date/)
const combobox = (label: RegExp) => screen.getByRole('combobox', { name: label })

async function replace(user: UserEvent, input: HTMLElement, value: string) {
  await user.clear(input)
  if (value) await user.type(input, value)
}

async function choose(user: UserEvent, label: RegExp, option: string) {
  await user.click(combobox(label))
  await user.click(screen.getByRole('option', { name: option }))
}

async function fillValidForm(user: UserEvent) {
  await choose(user, /Vendor/, 'AutoNation')
  await user.type(textbox(/Make/), vehicleFormValues.make)
  await user.type(textbox(/Model/), vehicleFormValues.model)
  await user.type(numberField(/Year/), vehicleFormValues.year)
  await user.type(textbox(/Color/), vehicleFormValues.color)
  await choose(user, /Warehouse/, vehicleFormValues.warehouse)
  await user.type(textbox(/VIN/), vehicleFormValues.vin)
  await user.type(numberField(/Purchase Price/), vehicleFormValues.purchasePrice)
  await replace(user, numberField(/Additional Costs/), vehicleFormValues.additionalCosts)
  await user.type(numberField(/List Price/), vehicleFormValues.sellingPrice)
}

const submit = () => screen.getByRole('button', { name: 'Add Vehicle' })

// The mount-time vendor lookup is always recorded; these tests care about what the form saves
const saves = (actions: { type: string }[]) => actions.filter((action) => action.type === VEHICLE_ACTIONS.CREATE)

const REQUIRED_MESSAGES = [
  'Select a vendor',
  'Make is required',
  'Model is required',
  'VIN is required',
  `Enter a year from 1900 to ${MAX_YEAR}`,
  'Enter a purchase price greater than zero',
]

describe('VehicleFormDialog', () => {
  it('renders the title, both sections and the defaults', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add Vehicle' })).toBeInTheDocument()
    expect(screen.getByText('Add a purchased vehicle to inventory')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Vehicle Information' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Acquisition Costs' })).toBeInTheDocument()
    expect(combobox(/Vendor/)).toHaveTextContent('Select vendor…')
    expect(combobox(/Warehouse/)).toHaveTextContent('Select warehouse…')
    expect(dateField()).toHaveValue(today())
    expect(numberField(/Purchase Price/)).toHaveValue(null)
    expect(numberField(/Additional Costs/)).toHaveValue(0)
    expect(screen.getByText('Total Vehicle Cost').nextElementSibling).toHaveTextContent('$0')
    expect(submit()).toBeEnabled()
  })

  it('loads the vendors on mount', () => {
    const { actions } = renderDialog({}, { vendors: false })
    expect(actions).toEqual([loadVehicleVendorOptions()])
  })

  it('disables the vendor dropdown while the vendors load', () => {
    renderDialog({}, { vendors: false })
    expect(combobox(/Vendor/)).toBeDisabled()
    expect(combobox(/Vendor/)).toHaveTextContent('Loading vendors…')
  })

  it('shows a warning when the vendors fail to load and retries', async () => {
    const { store, actions, user } = renderDialog({}, { vendors: false })
    act(() => { store.dispatch(loadVehicleVendorOptionsFailure('Vendors could not be loaded. Please try again.')) })

    expect(screen.getByText('Vendors could not be loaded. Please try again.')).toBeInTheDocument()
    expect(combobox(/Vendor/)).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS)).toHaveLength(2)
  })

  it('offers the loaded vendors and the three warehouses', async () => {
    const { user } = renderDialog()
    await user.click(combobox(/Vendor/))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['AutoNation', 'CarMax Wholesale'])
    await user.click(screen.getByRole('option', { name: 'AutoNation' }))

    await user.click(combobox(/Warehouse/))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Main Lot', 'Showroom', 'Lot B'])
  })

  it('shows every required message for an empty form and does not save', async () => {
    const { actions, user } = renderDialog()
    await user.click(submit())

    for (const message of REQUIRED_MESSAGES) expect(screen.getByText(message)).toBeInTheDocument()
    expect(saves(actions)).toHaveLength(0)
  })

  it('requires a purchase date', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.clear(dateField())
    await user.click(submit())

    expect(screen.getByText('Purchase date is required')).toBeInTheDocument()
    expect(saves(actions)).toHaveLength(0)
  })

  it.each([
    ['a year before 1900', /Year/, '1899', `Enter a year from 1900 to ${MAX_YEAR}`],
    ['a year after next year', /Year/, String(MAX_YEAR + 1), `Enter a year from 1900 to ${MAX_YEAR}`],
    ['a zero purchase price', /Purchase Price/, '0', 'Enter a purchase price greater than zero'],
    ['negative additional costs', /Additional Costs/, '-5', 'Costs cannot be negative'],
    ['a negative list price', /List Price/, '-5', 'List price cannot be negative'],
  ])('rejects %s', async (_, label, value, message) => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await replace(user, numberField(label), value)
    await user.click(submit())

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(saves(actions)).toHaveLength(0)
  })

  it('clears a field error as soon as the field is edited', async () => {
    const { user } = renderDialog()
    await user.click(submit())
    expect(screen.getByText('Make is required')).toBeInTheDocument()

    await user.type(textbox(/Make/), 'F')
    expect(screen.queryByText('Make is required')).not.toBeInTheDocument()
    expect(screen.getByText('Model is required')).toBeInTheDocument()
  })

  it('totals the purchase price and additional costs as they are typed', async () => {
    const { user } = renderDialog()
    await user.type(numberField(/Purchase Price/), '30000')
    await replace(user, numberField(/Additional Costs/), '500')
    expect(screen.getByText('Total Vehicle Cost').nextElementSibling).toHaveTextContent('$30,500')
  })

  it('dispatches createVehicle with the typed values', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(submit())
    expect(saves(actions)).toEqual([createVehicle({ ...vehicleFormValues, purchaseDate: today() })])
  })

  it('accepts the optional fields left blank', async () => {
    const { actions, user } = renderDialog()
    await choose(user, /Vendor/, 'CarMax Wholesale')
    await user.type(textbox(/Make/), 'Ford')
    await user.type(textbox(/Model/), 'F-150')
    await user.type(numberField(/Year/), '2024')
    await user.type(textbox(/VIN/), '1FTFW1E50PFA00001')
    await user.type(numberField(/Purchase Price/), '30000')
    await replace(user, numberField(/Additional Costs/), '')
    await user.click(submit())

    expect(saves(actions)).toEqual([createVehicle({
      vendorId: '5',
      vin: '1FTFW1E50PFA00001',
      make: 'Ford',
      model: 'F-150',
      year: '2024',
      color: '',
      purchaseDate: today(),
      warehouse: '',
      purchasePrice: '30000',
      additionalCosts: '',
      sellingPrice: '',
    })])
  })

  it('locks the form while saving', async () => {
    const { onClose, user } = renderDialog({ saveStatus: 'loading' })

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close add vehicle form' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Vehicle Information' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Acquisition Costs' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows server errors and hides a field error once that field is edited', async () => {
    const { user } = renderDialog({
      saveStatus: 'error',
      saveError: 'Something went wrong while saving.',
      fieldErrors: { vin: 'The Vin field is required.', purchasePrice: 'Not a number' },
    })

    expect(screen.getByText('Something went wrong while saving.')).toBeInTheDocument()
    expect(screen.getByText('The Vin field is required.')).toBeInTheDocument()

    await user.type(textbox(/VIN/), 'x')
    expect(screen.queryByText('The Vin field is required.')).not.toBeInTheDocument()
    expect(screen.getByText('Not a number')).toBeInTheDocument()
  })

  it('shows server errors on the dropdowns and hides them once a new option is chosen', async () => {
    const { user } = renderDialog({ saveStatus: 'error', fieldErrors: { vendorId: 'Bad vendor', warehouse: 'Bad warehouse' } })
    expect(screen.getByText('Bad vendor')).toBeInTheDocument()
    expect(screen.getByText('Bad warehouse')).toBeInTheDocument()

    await choose(user, /Warehouse/, 'Showroom')
    expect(screen.queryByText('Bad warehouse')).not.toBeInTheDocument()
    expect(screen.getByText('Bad vendor')).toBeInTheDocument()
  })

  it.each([
    ['Cancel', 'Cancel'],
    ['the close button', 'Close add vehicle form'],
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
