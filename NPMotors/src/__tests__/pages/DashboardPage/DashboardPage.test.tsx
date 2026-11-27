import { act, screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { loadDashboardFailure } from '../../../redux/dashboard/dashboard.actions'
import { DASHBOARD_ACTIONS } from '../../../redux/dashboard/dashboard.constants'
import { DashboardPage } from '../../../pages/DashboardPage/DashboardPage'
import { summary } from '../../../test/fixtures/dashboard'
import { makeDashboardState, renderWithProviders } from '../../../test/test-utils'

const loaded = makeDashboardState({ summary, status: 'success', query: { month: '2026-11' } })

const renderLoaded = () => renderWithProviders(
  <Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/customers" element={<p>Customers route</p>} />
  </Routes>,
  { preloadedState: loaded },
)

describe('DashboardPage', () => {
  it('loads the summary on mount and shows a spinner until it arrives', () => {
    const { actions } = renderWithProviders(<DashboardPage />)
    expect(actions.map((action) => action.type)).toContain(DASHBOARD_ACTIONS.LOAD)
    expect(screen.getByText('Loading dashboard…')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Dealership metrics' })).not.toBeInTheDocument()
  })

  it('renders the six metrics from the summary', () => {
    renderLoaded()
    expect(screen.getByText('Thursday, November 26, 2026')).toBeInTheDocument()
    expect(screen.getByText(/Nov 1 – Nov 26, 2026/)).toBeInTheDocument()
    const metrics = screen.getByRole('region', { name: 'Dealership metrics' })
    expect(within(metrics).getAllByRole('article')).toHaveLength(6)
    expect(within(metrics).getByText('$370,950')).toBeInTheDocument()
    expect(within(metrics).getByText('$321,651')).toBeInTheDocument()
    expect(within(metrics).getByText('14 open invoices')).toBeInTheDocument()
    // 9 sold against 6 last month; revenue has no previous month to compare with
    expect(within(metrics).getByText('+50.0%', { exact: false })).not.toHaveClass('metric-trend--negative')
    expect(within(metrics).getByText('Last month: $0')).toBeInTheDocument()
  })

  it('charts the monthly revenue and the available vehicles by make', () => {
    renderLoaded()
    expect(screen.getByRole('img', { name: /Nov \$370,950/ })).toBeInTheDocument()
    expect(screen.getByText('Last 7 months')).toBeInTheDocument()
    expect(screen.getByText('Toyota')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View inventory' })).toHaveAttribute('href', '/vehicle-inventory')
  })

  it('lists the recent invoices with their status and their customers', () => {
    renderLoaded()
    const table = screen.getByRole('table', { name: 'Recent sales invoices' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('INV-005872')).toBeInTheDocument()
    expect(within(table).getByText('Partial')).toHaveClass('status--partial')
    expect(within(table).getByText('Paid')).toHaveClass('status--paid')
    expect(screen.getByText('Purchased a Honda Civic')).toBeInTheDocument()
    expect(screen.getByText('SJ')).toBeInTheDocument()
  })

  it('shows the empty states', () => {
    renderWithProviders(<DashboardPage />, {
      preloadedState: makeDashboardState({ summary: { ...summary, recentInvoices: [], availableByMake: [] }, status: 'success' }),
    })
    expect(screen.getByText('No sales invoices yet.')).toBeInTheDocument()
    expect(screen.getByText('No recent customers.')).toBeInTheDocument()
    expect(screen.getByText('No available vehicles.')).toBeInTheDocument()
  })

  it('hides the summary on error and retries', async () => {
    const { store, user, actions } = renderLoaded()
    // Mounting dispatches LOAD, so fail after mount as the saga would
    act(() => { store.dispatch(loadDashboardFailure('Dashboard service is unreachable.')) })
    expect(screen.getByText('Couldn\'t load the dashboard')).toBeInTheDocument()
    expect(screen.getByText('Dashboard service is unreachable.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Dealership metrics' })).not.toBeInTheDocument()
    actions.length = 0
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.map((action) => action.type)).toEqual([DASHBOARD_ACTIONS.LOAD])
  })

  it('loads another month from the month picker', async () => {
    const { user, actions } = renderLoaded()
    await user.click(screen.getByRole('combobox', { name: 'Month' }))
    const options = screen.getAllByRole('option')
    await user.click(options[1]!)
    expect(actions.at(-1)).toMatchObject({ type: DASHBOARD_ACTIONS.SET_MONTH })
  })

  it('navigates to customers from Manage customer relationships', async () => {
    const { user } = renderLoaded()
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/customers')
    await user.click(screen.getByRole('link', { name: 'Manage customer relationships' }))
    expect(screen.getByText('Customers route')).toBeInTheDocument()
  })
})
