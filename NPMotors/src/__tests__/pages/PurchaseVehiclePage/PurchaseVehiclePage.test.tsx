import { act, screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PurchaseVehiclePage } from '../../../pages/PurchaseVehiclePage/PurchaseVehiclePage'
import {
  loadVehicleBankAccountOptions,
  loadVehicleBankAccountOptionsSuccess,
  loadVehicleVendorOptions,
  loadVehicleVendorOptionsSuccess,
  purchaseVehicleFailure,
  purchaseVehicleSuccess,
  resetVehiclePurchase,
} from '../../../redux/vehicles/vehicles.actions'
import { VEHICLE_ACTIONS } from '../../../redux/vehicles/vehicles.constants'
import type { VehiclesState } from '../../../redux/vehicles/vehicles.reducer'
import { vehicleBankAccountOptions, vehiclePurchaseResult, vehicleVendorOptions } from '../../../test/fixtures/vehicles'
import { makeVehicleState, renderWithProviders } from '../../../test/test-utils'

// The page loads vendors and bank accounts on mount; with no saga the helper answers both, as the saga would.
// It sits in a small route table so the redirect to Vehicle Inventory can be seen.
function renderPage(overrides: Partial<VehiclesState> = {}) {
  const result = renderWithProviders(
    <Routes>
      <Route path="/purchase-vehicle" element={<PurchaseVehiclePage />} />
      <Route path="/vehicle-inventory" element={<p>Inventory page</p>} />
    </Routes>,
    { preloadedState: makeVehicleState(overrides), route: '/purchase-vehicle' },
  )
  act(() => {
    result.store.dispatch(loadVehicleVendorOptionsSuccess(vehicleVendorOptions))
    result.store.dispatch(loadVehicleBankAccountOptionsSuccess(vehicleBankAccountOptions))
  })
  return result
}

const textbox = (label: RegExp) => screen.getByRole('textbox', { name: label })
const numberField = (label: RegExp) => screen.getByRole('spinbutton', { name: label })
const currentStep = () => screen.getByRole('button', { current: 'step' })

async function choose(user: UserEvent, label: RegExp, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(screen.getByRole('option', { name: option }))
}

async function fillVehicleInfo(user: UserEvent) {
  await choose(user, /Vendor/, 'AutoNation')
  await user.type(textbox(/Make/), 'Ford')
  await user.type(textbox(/Model/), 'F-150')
  await user.type(numberField(/Year/), '2024')
  await user.type(textbox(/VIN/), '1FTFW1E50PFA00001')
  await user.click(screen.getByRole('button', { name: 'Next: Costs →' }))
}

async function fillCosts(user: UserEvent) {
  await user.type(numberField(/Purchase Price/), '30000')
  await user.type(numberField(/Sales Tax/), '900.10')
  await user.type(numberField(/Transportation/), '300')
  await user.click(screen.getByRole('button', { name: 'Next: Payment →' }))
}

const purchases = (actions: { type: string }[]) => actions.filter((action) => action.type === VEHICLE_ACTIONS.PURCHASE)

describe('PurchaseVehiclePage', () => {
  it('renders the breadcrumb, the four steps and the first step, and loads its options', () => {
    const { actions } = renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Purchase Vehicle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← Vehicle Inventory' })).toBeInTheDocument()
    expect(currentStep()).toHaveTextContent('Vehicle Info')
    expect(screen.getByRole('heading', { name: 'Vehicle Information' })).toBeInTheDocument()
    expect(actions).toContainEqual(resetVehiclePurchase())
    expect(actions).toContainEqual(loadVehicleVendorOptions())
    expect(actions).toContainEqual(loadVehicleBankAccountOptions())
  })

  it('shows the required-field errors and stays on step 1 when Next is pressed on an empty form', async () => {
    const { user } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Next: Costs →' }))
    expect(screen.getByText('Select a vendor')).toBeInTheDocument()
    expect(screen.getByText('VIN is required')).toBeInTheDocument()
    expect(currentStep()).toHaveTextContent('Vehicle Info')
  })

  it('does not let a step tab skip past an invalid step', async () => {
    const { user } = renderPage()
    await user.click(screen.getByRole('button', { name: /Review/ }))
    expect(currentStep()).toHaveTextContent('Vehicle Info')
    expect(screen.getByText('Make is required')).toBeInTheDocument()
  })

  it('totals the acquisition costs in the breakdown and the sidebar', async () => {
    const { user } = renderPage()
    await fillVehicleInfo(user)
    await user.type(numberField(/Purchase Price/), '30000')
    await user.type(numberField(/Sales Tax/), '900.10')
    expect(screen.getAllByText('$30,900.10')).toHaveLength(2)
  })

  it('walks through every step and posts a bank-paid purchase', async () => {
    const { actions, user } = renderPage()
    await fillVehicleInfo(user)
    await fillCosts(user)

    expect(screen.getByRole('heading', { name: 'Payment Method' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next: Review →' }))
    expect(screen.getByText('Select the account to pay from')).toBeInTheDocument()

    await choose(user, /Bank Account/, 'Chase — Operating ($120,000.00)')
    await user.click(screen.getByRole('button', { name: 'Next: Review →' }))

    expect(screen.getByRole('heading', { name: 'Review & Post' })).toBeInTheDocument()
    expect(screen.getByText('2024 Ford F-150')).toBeInTheDocument()
    expect(screen.getByText('✓ Reduce bank account balance')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Post & Add to Inventory' }))
    expect(purchases(actions)).toHaveLength(1)
    expect(purchases(actions)[0]).toMatchObject({
      payload: {
        vendorId: '1', make: 'Ford', model: 'F-150', year: '2024', vin: '1FTFW1E50PFA00001', warehouse: 'WH-A',
        purchasePrice: '30000', salesTax: '900.1', transportCost: '300', paymentCondition: 'paidInFull', bankAccountId: '3',
      },
    })
  })

  it('posts a credit purchase without asking for a bank account', async () => {
    const { actions, user } = renderPage()
    await fillVehicleInfo(user)
    await fillCosts(user)
    await user.click(screen.getByRole('radio', { name: 'Accounts Payable (Credit)' }))
    expect(screen.queryByRole('combobox', { name: /Bank Account/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Payment will be recorded as Accounts Payable/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next: Review →' }))
    expect(screen.getByText('✓ Create vendor payable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Post & Add to Inventory' }))
    expect(purchases(actions)[0]).toMatchObject({ payload: { paymentCondition: 'credit' } })
  })

  it('returns to Vehicle Inventory once the purchase is posted', async () => {
    const { store, user } = renderPage()
    await fillVehicleInfo(user)
    await fillCosts(user)
    await choose(user, /Bank Account/, 'Chase — Operating ($120,000.00)')
    await user.click(screen.getByRole('button', { name: 'Next: Review →' }))
    await user.click(screen.getByRole('button', { name: 'Post & Add to Inventory' }))

    act(() => { store.dispatch(purchaseVehicleSuccess(vehiclePurchaseResult)) })
    expect(await screen.findByText('Inventory page')).toBeInTheDocument()
  })

  it('does not redirect for a success left over from an earlier purchase', () => {
    renderPage({ purchaseStatus: 'success', purchaseResult: vehiclePurchaseResult })
    expect(screen.queryByText('Inventory page')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Purchase Vehicle' })).toBeInTheDocument()
  })

  it('shows a business-rule rejection on the review step', async () => {
    const { store, user } = renderPage()
    await fillVehicleInfo(user)
    await fillCosts(user)
    await choose(user, /Bank Account/, 'Chase — Operating ($120,000.00)')
    await user.click(screen.getByRole('button', { name: 'Next: Review →' }))
    await user.click(screen.getByRole('button', { name: 'Post & Add to Inventory' }))

    act(() => { store.dispatch(purchaseVehicleFailure({ message: 'A vehicle with this VIN already exists.', fieldErrors: {} })) })
    const alert = screen.getByText('A vehicle with this VIN already exists.')
    expect(within(alert.closest('.fui-MessageBar') as HTMLElement).getByText("Couldn't post the purchase")).toBeInTheDocument()
    expect(currentStep()).toHaveTextContent('Review')
  })

  it('goes back to the step holding a server field error', async () => {
    const { store, user } = renderPage()
    await fillVehicleInfo(user)
    await fillCosts(user)
    await choose(user, /Bank Account/, 'Chase — Operating ($120,000.00)')
    await user.click(screen.getByRole('button', { name: 'Next: Review →' }))
    await user.click(screen.getByRole('button', { name: 'Post & Add to Inventory' }))

    act(() => { store.dispatch(purchaseVehicleFailure({ message: '', fieldErrors: { vin: 'VIN must be exactly 17 characters.' } })) })
    expect(currentStep()).toHaveTextContent('Vehicle Info')
    expect(screen.getByText('VIN must be exactly 17 characters.')).toBeInTheDocument()

    // Editing the field hides the server message (the VIN is already at its 17-character limit, so clear it)
    await user.clear(textbox(/VIN/))
    expect(screen.queryByText('VIN must be exactly 17 characters.')).not.toBeInTheDocument()
  })

  it('goes back a step with Back, keeping what was entered', async () => {
    const { user } = renderPage()
    await fillVehicleInfo(user)
    await user.click(screen.getByRole('button', { name: '← Back' }))
    expect(currentStep()).toHaveTextContent('Vehicle Info')
    expect(textbox(/Make/)).toHaveValue('Ford')
  })

  it('disables the form while posting', async () => {
    const { store, user } = renderPage()
    await fillVehicleInfo(user)
    await fillCosts(user)
    await choose(user, /Bank Account/, 'Chase — Operating ($120,000.00)')
    await user.click(screen.getByRole('button', { name: 'Next: Review →' }))
    await user.click(screen.getByRole('button', { name: 'Post & Add to Inventory' }))
    expect(store.getState().vehicles.purchaseStatus).toBe('loading')
    expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '← Back' })).toBeDisabled()
  })
})
