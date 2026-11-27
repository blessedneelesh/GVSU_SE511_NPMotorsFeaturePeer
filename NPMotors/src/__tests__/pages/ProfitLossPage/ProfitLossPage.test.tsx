import { act, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfitLossPage } from '../../../pages/ProfitLossPage/ProfitLossPage'
import {
  loadProfitLoss,
  loadProfitLossFailure,
  loadProfitLossSuccess,
  setProfitLossAnchorMonth,
  setProfitLossPeriodType,
} from '../../../redux/profitLoss/profitLoss.actions'
import type { ProfitLossState } from '../../../redux/profitLoss/profitLoss.reducer'
import { monthComparison } from '../../../test/fixtures/reports'
import { makeProfitLossState, renderWithProviders } from '../../../test/test-utils'

// The page dispatches loadProfitLoss() on mount; without a saga, each test dispatches the response itself
function renderLoaded(overrides: Partial<ProfitLossState> = {}) {
  const result = renderWithProviders(<ProfitLossPage />, { preloadedState: makeProfitLossState(overrides) })
  act(() => { result.store.dispatch(loadProfitLossSuccess(monthComparison)) })
  return result
}

const getTable = () => screen.getByRole('table', { name: 'Profit and loss statement' })
const rowFor = (label: string) => within(getTable()).getByText(label).closest('tr')!

describe('ProfitLossPage', () => {
  it('loads on mount and shows a spinner instead of the report', () => {
    const { actions } = renderWithProviders(<ProfitLossPage />, { preloadedState: makeProfitLossState() })
    expect(actions).toContainEqual(loadProfitLoss())
    expect(screen.getByText('Loading profit and loss…')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
  })

  it('names both periods in the subtitle and the column headers', () => {
    renderLoaded()
    expect(screen.getByRole('heading', { name: 'Profit & Loss Statement' })).toBeInTheDocument()
    expect(screen.getByText('NPMotors · November 2026 vs October 2026')).toBeInTheDocument()
    const headers = within(getTable()).getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toEqual(['Category', 'November 2026', 'October 2026', 'Change'])
  })

  it('shows the summary cards with margins and previous values', () => {
    renderLoaded()
    const revenueCard = screen.getByText('Total Revenue', { selector: '.stat-label' }).closest('.stat-card') as HTMLElement
    expect(within(revenueCard).getByText('$370,950')).toHaveClass('stat-value--blue')
    expect(screen.getByText('Previous: $0')).toBeInTheDocument()
    expect(screen.getByText('Margin: 19.5%')).toBeInTheDocument()
    expect(screen.getByText('Margin: 13.1%')).toBeInTheDocument()
    expect(screen.getByText('Previous: $12,658.33')).toBeInTheDocument()
  })

  it('renders lines, subtotals and changes', () => {
    renderLoaded()
    const vehicleSales = rowFor('Vehicle Sales')
    expect(within(vehicleSales).getByText('$367,800')).toBeInTheDocument()
    expect(within(vehicleSales).getByText('—')).toHaveClass('pl-change--neutral')

    // A cost going up is unfavourable
    const opex = rowFor('Total Operating Expenses')
    expect(opex).toHaveClass('pl-subtotal', 'pl-subtotal--neutral')
    expect(within(opex).getByText(/^▲ 87\.[89]%$/)).toHaveClass('pl-change--negative')

    const net = rowFor('NET PROFIT')
    expect(net).toHaveClass('pl-subtotal--dark')
    expect(net).not.toHaveClass('pl-subtotal--loss')
    expect(within(net).getByText('$48,531.67')).toBeInTheDocument()
    expect(within(net).getByText('($12,658.33)')).toBeInTheDocument()
    expect(within(net).getByText('▲ 483.4%')).toHaveClass('pl-change--positive')

    expect(within(getTable()).getByText('Less: Discounts')).toHaveClass('pl-line__label--muted')
  })

  it('marks a net loss', () => {
    const { store } = renderLoaded()
    // Swap the periods so the current column shows October's loss
    const swapped = { ...monthComparison, current: monthComparison.previous, previous: monthComparison.current }
    act(() => { store.dispatch(loadProfitLossSuccess(swapped)) })
    expect(rowFor('NET PROFIT')).toHaveClass('pl-subtotal--loss')
    // No revenue in October, so both margins are unavailable
    expect(screen.getAllByText('Margin: —')).toHaveLength(2)
  })

  it('shows the source notes with counts', () => {
    renderLoaded()
    expect(screen.getByText('9 posted invoices in November 2026')).toBeInTheDocument()
    expect(screen.getByText('9 vehicles sold in November 2026')).toBeInTheDocument()
  })

  it('dispatches period and month changes', async () => {
    const { user, actions } = renderLoaded({ query: { periodType: 'Month', anchorMonth: '2026-11' } })
    await user.click(screen.getByRole('combobox', { name: 'Period' }))
    await user.click(screen.getByRole('option', { name: 'Year to Date' }))
    expect(actions).toContainEqual(setProfitLossPeriodType('YearToDate'))

    await user.click(screen.getByRole('combobox', { name: 'Anchor month' }))
    const options = screen.getAllByRole('option')
    await user.click(options[1]!)
    expect(actions.some((action) => action.type === setProfitLossAnchorMonth('').type)).toBe(true)
  })

  it('hides the report and offers Retry on error', async () => {
    const { store, user, actions } = renderLoaded()
    act(() => { store.dispatch(loadProfitLossFailure('Report service is unreachable.')) })
    expect(screen.getByText("Couldn't load the profit and loss statement")).toBeInTheDocument()
    expect(screen.getByText('Report service is unreachable.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadProfitLoss().type)).toHaveLength(2)
  })

  it('dims the report while another period loads', () => {
    const { store } = renderLoaded()
    act(() => { store.dispatch(setProfitLossPeriodType('Quarter')) })
    expect(getTable().closest('.is-refreshing')).not.toBeNull()
  })

  it('prints', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const { user } = renderLoaded()
    await user.click(screen.getByRole('button', { name: 'Print' }))
    expect(print).toHaveBeenCalled()
  })
})
