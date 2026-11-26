import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AccountsPayablePage } from '../../../pages/AccountsPayablePage/AccountsPayablePage'
import {
  loadPayables,
  loadPayablesFailure,
  loadPayablesSuccess,
  loadPayableVendorOptions,
  resetPayableFilters,
  setPayableAsOfDate,
  setPayablePage,
  setPayableStatusFilter,
  setPayableVendorFilter,
  selectPayable,
  resetPayableSave,
} from '../../../redux/payables/payables.actions'
import type { PayablesState } from '../../../redux/payables/payables.reducer'
import {
  overduePayable,
  overduePayableDetail,
  partialPayable,
  payableVendorOptions,
  recentOverduePayable,
  sparsePayable,
  unpaidPayable,
} from '../../../test/fixtures/payables'
import { makePayableState, renderWithProviders } from '../../../test/test-utils'
import type { Payable, PayableQuery } from '../../../types/payables'

// The page dispatches loadPayables() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: Payable[], overrides: Partial<PayablesState> = {}, hasNext = false) {
  const result = renderWithProviders(<AccountsPayablePage />, {
    preloadedState: makePayableState({ vendorOptions: payableVendorOptions, ...overrides }),
  })
  act(() => { result.store.dispatch(loadPayablesSuccess({ items, hasNext })) })
  return result
}

const withQuery = (changes: Partial<PayableQuery>): Partial<PayablesState> => ({
  query: { pageNumber: 1, pageSize: 5, status: 'all', vendorId: 'all', asOfDate: '', ...changes },
})

const getTable = () => screen.getByRole('table', { name: 'Accounts payable' })

describe('AccountsPayablePage', () => {
  it('loads the bills and the vendors on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<AccountsPayablePage />, { preloadedState: makePayableState() })
    expect(actions).toContainEqual(loadPayables())
    expect(actions).toContainEqual(loadPayableVendorOptions())
    expect(screen.getByText('Loading payables…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Accounts payable' })).not.toBeInTheDocument()
  })

  it('renders a row per bill with the count, dates, amounts, age and badges', () => {
    renderLoaded([overduePayable, recentOverduePayable, partialPayable, unpaidPayable])

    expect(screen.getByRole('heading', { name: 'Accounts Payable' })).toBeInTheDocument()
    expect(screen.getByText('Outstanding vendor balances · 4 bills on this page')).toBeInTheDocument()
    const rows = within(getTable()).getAllByRole('row')
    // header row + 4 bills + the total row
    expect(rows).toHaveLength(6)

    const [, overdueRow, recentRow, partialRow, unpaidRow] = rows
    expect(within(overdueRow!).getByRole('button', { name: 'BILL-0020' })).toHaveClass('payable-link')
    expect(within(overdueRow!).getByText('Honda Auto Parts')).toBeInTheDocument()
    expect(within(overdueRow!).getByText('2024-03-12')).toBeInTheDocument()
    expect(within(overdueRow!).getByText('2024-04-26')).toBeInTheDocument()
    expect(within(overdueRow!).getAllByText('$12,400')).toHaveLength(2)
    expect(within(overdueRow!).getByText('$0')).toHaveClass('text-green')
    expect(within(overdueRow!).getByText('943d')).toHaveClass('text-red')
    expect(within(overdueRow!).getByText('Overdue')).toHaveClass('badge-overdue')

    expect(within(recentRow!).getByText('4d')).toHaveClass('text-amber')
    expect(within(recentRow!).getByText('$25,480', { selector: '.strong' })).toHaveClass('text-red')

    expect(within(partialRow!).getByText('Current')).toHaveClass('text-green')
    expect(within(partialRow!).getByText('$47,320')).toHaveClass('text-red')
    expect(within(partialRow!).getByText('Partial')).toHaveClass('badge-partial')
    expect(within(unpaidRow!).getByText('Unpaid')).toHaveClass('badge-pending')
  })

  it('falls back for missing fields', () => {
    renderLoaded([sparsePayable])
    const [, row] = within(getTable()).getAllByRole('row')
    // bill number, vendor, bill date and due date
    expect(within(row!).getAllByText('—')).toHaveLength(4)
    // Without an id there's nothing to open
    expect(within(row!).getByRole('button', { name: '—' })).toBeDisabled()
  })

  it('opens the detail view from the bill number', async () => {
    const { actions, user } = renderLoaded([overduePayable, partialPayable])
    await user.click(screen.getByRole('button', { name: 'AP-2026-000011' }))
    expect(actions).toContainEqual(selectPayable('11'))
  })

  it('shows the detail instead of the list while a bill is selected', () => {
    renderLoaded([overduePayable], { selectedId: '4', selected: overduePayableDetail, detailStatus: 'success' })
    expect(screen.queryByRole('table', { name: 'Accounts payable' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'BILL-0020' })).toBeInTheDocument()
  })

  it('uses the singular for a single bill', () => {
    renderLoaded([overduePayable])
    expect(screen.getByText('Outstanding vendor balances · 1 bill on this page')).toBeInTheDocument()
  })

  describe('page total', () => {
    it('sums the amount, paid and balance of the page', () => {
      renderLoaded([overduePayable, partialPayable])
      const rows = within(getTable()).getAllByRole('row')
      const total = rows[rows.length - 1]!
      expect(total).toHaveClass('payables-total-row')
      expect(within(total).getByText('Page total (2 bills)')).toBeInTheDocument()
      expect(within(total).getByText('$64,720')).toBeInTheDocument()
      expect(within(total).getByText('$5,000')).toHaveClass('text-green')
      expect(within(total).getByText('$59,720')).toHaveClass('text-red')
    })

    it('is not shown when the page is empty', () => {
      renderLoaded([])
      expect(screen.queryByText(/Page total/)).not.toBeInTheDocument()
    })
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No outstanding payables found.')).toBeInTheDocument()
  })

  it('adds the clear hint when a filter is active', () => {
    renderLoaded([], withQuery({ vendorId: '3' }))
    expect(screen.getByText('No outstanding payables found. Try clearing the filters.')).toBeInTheDocument()
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], withQuery({ pageNumber: 2 }))
    expect(screen.getByText('No more payables on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<AccountsPayablePage />, { preloadedState: makePayableState() })
    act(() => { store.dispatch(loadPayablesFailure('The server is not responding.')) })

    expect(screen.getByText("Couldn't load payables")).toBeInTheDocument()
    expect(screen.getByText('The server is not responding.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Accounts payable' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadPayables().type)).toHaveLength(2)
  })

  it('pages forward when the API says there are more bills', async () => {
    const { actions, user } = renderLoaded([overduePayable], {}, true)
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(actions).toContainEqual(setPayablePage(2))
  })

  it('disables Export when the page is empty, and has no Print (the design has Export only)', () => {
    renderLoaded([])
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
  })

  it('labels the columns as the design does', () => {
    renderLoaded([overduePayable])
    expect(within(getTable()).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Bill #', 'Vendor', 'Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Age', 'Status', 'Actions',
    ])
  })

  it('offers Pay on bills with a balance, and opens the payment dialog for the row', async () => {
    const { actions, user } = renderLoaded([overduePayable, { ...partialPayable, balance: 0, id: '99', number: 'AP-PAID' }, sparsePayable])
    expect(screen.getAllByRole('button', { name: /^Pay / }).map((button) => button.getAttribute('aria-label'))).toEqual(['Pay BILL-0020'])

    await user.click(screen.getByRole('button', { name: 'Pay BILL-0020' }))
    expect(actions).toContainEqual(resetPayableSave())
    const dialog = screen.getByRole('dialog', { name: 'Make Payment' })
    expect(within(dialog).getByText('BILL-0020 · Honda Auto Parts')).toBeInTheDocument()
    expect(within(dialog).getByRole('spinbutton', { name: /Payment Amount/ })).toHaveValue(12400)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Make Payment' })).not.toBeInTheDocument()
  })

  describe('filters', () => {
    it('offers the API\'s statuses, with no Paid, and dispatches the chosen one', async () => {
      const { actions, user } = renderLoaded([overduePayable])
      const filter = screen.getByRole('combobox', { name: 'Status' })
      expect(filter).toHaveTextContent('All Status')
      await user.click(filter)
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'All Status', 'Overdue', 'Unpaid (not yet due)', 'Partial (not yet due)',
      ])
      await user.click(screen.getByRole('option', { name: 'Overdue' }))
      expect(actions).toContainEqual(setPayableStatusFilter('overdue'))
    })

    it('offers every loaded vendor and dispatches the chosen id', async () => {
      const { actions, user } = renderLoaded([overduePayable])
      const filter = screen.getByRole('combobox', { name: 'Vendor' })
      expect(filter).toHaveTextContent('All Vendors')
      await user.click(filter)
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'All Vendors', 'AutoNation Wholesale', 'CarMax Auctions', 'Honda Auto Parts',
      ])
      await user.click(screen.getByRole('option', { name: 'Honda Auto Parts' }))
      expect(actions).toContainEqual(setPayableVendorFilter('3'))
    })

    it('shows the selected vendor by name, or by id before the vendors load', () => {
      renderLoaded([overduePayable], withQuery({ vendorId: '3' }))
      expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveTextContent('Honda Auto Parts')
    })

    it('falls back to the vendor id while the options are loading', () => {
      renderLoaded([overduePayable], { ...withQuery({ vendorId: '9' }), vendorOptions: [] })
      expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveTextContent('Vendor #9')
    })

    it('dispatches the aging date', () => {
      const { actions } = renderLoaded([overduePayable])
      expect(screen.getByText('Today')).toBeInTheDocument()
      fireEvent.change(screen.getByLabelText('Aging as of'), { target: { value: '2024-04-01' } })
      expect(actions).toContainEqual(setPayableAsOfDate('2024-04-01'))
    })

    it('enables Clear only with an active filter and resets them all', async () => {
      const { unmount } = renderLoaded([overduePayable])
      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
      unmount()

      const { actions, user } = renderLoaded([overduePayable], withQuery({ asOfDate: '2024-04-01' }))
      await user.click(screen.getByRole('button', { name: 'Clear' }))
      expect(actions).toContainEqual(resetPayableFilters())
    })
  })
})
