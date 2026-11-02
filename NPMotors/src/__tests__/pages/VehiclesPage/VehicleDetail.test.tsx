import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VehicleDetail } from '../../../pages/VehiclesPage/VehicleDetail'
import { clearVehicleSelection, selectVehicle } from '../../../redux/vehicles/vehicles.actions'
import { availableVehicle, sparseVehicle, vehicle } from '../../../test/fixtures/vehicles'
import { makeVehicleState, renderWithProviders } from '../../../test/test-utils'
import type { Vehicle } from '../../../types/vehicles'

const renderProfile = (selected: Vehicle) =>
  renderWithProviders(<VehicleDetail />, {
    preloadedState: makeVehicleState({ selectedId: selected.id || 'X', selected, detailStatus: 'success' }),
  })

// Every fact, stat and financial row is a <dt>/<dd> pair; returns the <dd> for a label inside a container
const valueOf = (container: HTMLElement, label: string) => {
  const value = within(container).getByText(label, { selector: 'dt' }).nextElementSibling
  if (!(value instanceof HTMLElement)) throw new Error(`No value for ${label}`)
  return value
}

const hero = (title: string) => {
  const section = screen.getByRole('heading', { name: title }).closest('section')
  if (!section) throw new Error('No hero card')
  return section
}

describe('VehicleDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<VehicleDetail />, { preloadedState: makeVehicleState({ selectedId: '2', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading vehicle…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Vehicle')).toBeInTheDocument()
  })

  it('shows the error and retries the same vehicle', async () => {
    const { actions, user } = renderWithProviders(<VehicleDetail />, {
      preloadedState: makeVehicleState({ selectedId: '2', detailStatus: 'error', detailError: 'This vehicle no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load vehicle")).toBeInTheDocument()
    expect(screen.getByText('This vehicle no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([selectVehicle('2')])
  })

  it('renders the hero card with the title, VIN, status and the five stats', () => {
    renderProfile(vehicle)

    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('2022 Chevrolet Silverado 1500')).toBeInTheDocument()
    const card = hero('2022 Chevrolet Silverado 1500')
    expect(within(card).getByText('VIN: 1GCUYDED5NZ123456')).toBeInTheDocument()
    expect(within(card).getByText('Sold')).toHaveClass('badge-cancelled')
    expect(valueOf(card, 'Purchase Price')).toHaveTextContent('$38,000')
    expect(valueOf(card, 'Total Cost')).toHaveTextContent('$39,500')
    expect(valueOf(card, 'Total Cost')).toHaveClass('text-blue')
    expect(valueOf(card, 'List Price')).toHaveTextContent('$44,500')
    expect(valueOf(card, 'Gross Profit')).toHaveTextContent('$5,000')
    expect(valueOf(card, 'Gross Profit')).toHaveClass('text-green')
    expect(valueOf(card, 'Margin')).toHaveTextContent('11.2%')
  })

  it('shows the specs and inventory facts on the Overview tab', () => {
    renderProfile(vehicle)

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    const panel = screen.getByRole('tabpanel', { name: 'Overview' })
    expect(valueOf(panel, 'Make')).toHaveTextContent('Chevrolet')
    expect(valueOf(panel, 'Model')).toHaveTextContent('Silverado 1500')
    expect(valueOf(panel, 'Year')).toHaveTextContent('2022')
    expect(valueOf(panel, 'Color')).toHaveTextContent('Black')
    expect(valueOf(panel, 'VIN')).toHaveTextContent('1GCUYDED5NZ123456')
    expect(valueOf(panel, 'For Sale')).toHaveTextContent('No')
    expect(valueOf(panel, 'Vehicle ID')).toHaveTextContent('2')
    expect(valueOf(panel, 'Warehouse')).toHaveTextContent('Main Lot')
    expect(valueOf(panel, 'Purchase Date')).toHaveTextContent('2026-03-14')
    expect(valueOf(panel, 'Status')).toHaveTextContent('Sold')
    expect(valueOf(panel, 'Vendor')).toHaveTextContent('AutoNation')
  })

  it('shows the realized profitability of a sold vehicle on the Cost Breakdown tab', async () => {
    const { user } = renderProfile(vehicle)
    await user.click(screen.getByRole('tab', { name: 'Cost Breakdown' }))

    expect(screen.queryByRole('tabpanel', { name: 'Overview' })).not.toBeInTheDocument()
    const panel = screen.getByRole('tabpanel', { name: 'Cost Breakdown' })
    expect(within(panel).getByText('Total Inventory Cost').nextElementSibling).toHaveTextContent('$39,500')
    expect(within(panel).getByRole('heading', { name: 'Profitability' })).toBeInTheDocument()
    expect(valueOf(panel, 'Selling Price')).toHaveTextContent('$44,500')
    expect(valueOf(panel, 'Total Cost')).toHaveTextContent('-$39,500')
    expect(valueOf(panel, 'Gross Profit')).toHaveTextContent('$5,000Margin 11.2%')
    expect(valueOf(panel, 'Gross Profit').parentElement).toHaveClass('is-gain')
    expect(within(panel).queryByText('Projected Gross Profit')).not.toBeInTheDocument()
  })

  it('shows the projected profit of a vehicle still for sale', async () => {
    const { user } = renderProfile(availableVehicle)
    await user.click(screen.getByRole('tab', { name: 'Cost Breakdown' }))

    const panel = screen.getByRole('tabpanel', { name: 'Cost Breakdown' })
    expect(within(panel).getByText('Projected Gross Profit')).toBeInTheDocument()
    expect(within(panel).getByText('At list price of $30,250')).toBeInTheDocument()
    expect(within(panel).getByText('$3,450')).toHaveClass('text-green')
    expect(within(panel).getByText('Margin 11.4% · Not yet realized')).toBeInTheDocument()
    expect(within(panel).queryByRole('heading', { name: 'Profitability' })).not.toBeInTheDocument()
  })

  it.each([
    ['sold', vehicle, 'Sale Price', 'Gross Profit'],
    ['available', availableVehicle, 'List Price', 'Projected Profit'],
  ] as const)('labels the sidebar financials for a %s vehicle', (_, selected, priceLabel, profitLabel) => {
    renderProfile(selected)
    const sidebar = screen.getByRole('complementary')
    expect(valueOf(sidebar, 'Total Cost')).toHaveTextContent(`$${selected.totalCost.toLocaleString('en-US')}`)
    expect(valueOf(sidebar, priceLabel)).toHaveTextContent(`$${selected.sellingPrice.toLocaleString('en-US')}`)
    expect(valueOf(sidebar, profitLabel)).toHaveTextContent(`$${selected.grossProfit.toLocaleString('en-US')}`)
    expect(within(sidebar).getByText(selected.purchaseDate)).toBeInTheDocument()
  })

  it('falls back for missing fields and shows a loss in red', () => {
    renderProfile(sparseVehicle)

    const card = hero('Unnamed vehicle')
    expect(within(card).getByText('VIN: —')).toBeInTheDocument()
    expect(within(card).getByText('Reserved')).toHaveClass('badge-pending')
    expect(valueOf(card, 'Gross Profit')).toHaveTextContent('-$1,200')
    expect(valueOf(card, 'Gross Profit')).toHaveClass('text-red')
    expect(valueOf(card, 'Margin')).toHaveClass('text-red')
    // Make, model, year, colour, VIN, vehicle ID, warehouse, purchase date and vendor
    expect(within(screen.getByRole('tabpanel', { name: 'Overview' })).getAllByText('—')).toHaveLength(9)
    // Purchased and warehouse in the Status card
    expect(within(screen.getByRole('complementary')).getAllByText('—')).toHaveLength(2)
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderProfile(vehicle)
    await user.click(screen.getByRole('button', { name: '← Vehicles' }))
    expect(actions).toEqual([clearVehicleSelection()])
  })
})
