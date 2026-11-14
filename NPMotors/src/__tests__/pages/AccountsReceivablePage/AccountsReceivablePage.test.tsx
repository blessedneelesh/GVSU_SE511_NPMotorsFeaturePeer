import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountsReceivablePage } from '../../../pages/AccountsReceivablePage/AccountsReceivablePage'
import {
  loadReceivableCustomerOptions,
  loadReceivables,
  loadReceivablesFailure,
  loadReceivablesSuccess,
  resetReceivableFilters,
  setReceivableAsOfDate,
  setReceivableCustomerFilter,
  setReceivablePage,
  setReceivableStatusFilter,
} from '../../../redux/receivables/receivables.actions'
import type { ReceivablesState } from '../../../redux/receivables/receivables.reducer'
import {
  overdueReceivable,
  partialReceivable,
  receivableCustomerOptions,
  recentOverdueReceivable,
  sparseReceivable,
  unpaidReceivable,
} from '../../../test/fixtures/receivables'
import { makeReceivableState, renderWithProviders } from '../../../test/test-utils'
import type { Receivable, ReceivableQuery } from '../../../types/receivables'

// The page dispatches loadReceivables() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: Receivable[], overrides: Partial<ReceivablesState> = {}, hasNext = false) {
  const result = renderWithProviders(<AccountsReceivablePage />, {
    preloadedState: makeReceivableState({ customerOptions: receivableCustomerOptions, ...overrides }),
  })
  act(() => { result.store.dispatch(loadReceivablesSuccess({ items, hasNext })) })
  return result
}

const withQuery = (changes: Partial<ReceivableQuery>): Partial<ReceivablesState> => ({
  query: { pageNumber: 1, pageSize: 5, status: 'all', customerId: 'all', asOfDate: '', ...changes },
})

const getTable = () => screen.getByRole('table', { name: 'Accounts receivable' })

describe('AccountsReceivablePage', () => {
  it('loads the receivables and the customers on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<AccountsReceivablePage />, { preloadedState: makeReceivableState() })
    expect(actions).toContainEqual(loadReceivables())
    expect(actions).toContainEqual(loadReceivableCustomerOptions())
    expect(screen.getByText('Loading receivables…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Accounts receivable' })).not.toBeInTheDocument()
  })

  it('renders a row per invoice with the count, amounts, days and badges', () => {
    renderLoaded([overdueReceivable, recentOverdueReceivable, partialReceivable, unpaidReceivable])

    expect(screen.getByRole('heading', { name: 'Accounts Receivable' })).toBeInTheDocument()
    expect(screen.getByText('Outstanding customer balances · 4 invoices on this page')).toBeInTheDocument()
    const table = getTable()
    // header row + 4 invoices + the total row
    expect(within(table).getAllByRole('row')).toHaveLength(6)

    const [, overdueRow, recentRow, partialRow, unpaidRow] = within(table).getAllByRole('row')
    expect(within(overdueRow!).getByText('SI-0005')).toHaveClass('mono', 'text-link')
    expect(within(overdueRow!).getByText('David Taylor')).toBeInTheDocument()
    expect(within(overdueRow!).getByText('2024-03-22')).toBeInTheDocument()
    expect(within(overdueRow!).getAllByText('$18,400')).toHaveLength(2)
    expect(within(overdueRow!).getByText('$0')).toHaveClass('text-green')
    expect(within(overdueRow!).getByText('967d')).toHaveClass('text-red')
    expect(within(overdueRow!).getByText('Overdue')).toHaveClass('badge-overdue')

    expect(within(recentRow!).getByText('AR-002471')).toBeInTheDocument()
    expect(within(recentRow!).getByText('for INV-004262')).toHaveClass('text-faint')
    expect(within(recentRow!).getByText('6d')).toHaveClass('text-amber')
    expect(within(recentRow!).getByText('$27,500')).toHaveClass('text-amber')

    expect(within(partialRow!).getByText('Current')).toHaveClass('text-green')
    expect(within(partialRow!).getByText('Partial')).toHaveClass('badge-partial')
    expect(within(unpaidRow!).getByText('Unpaid')).toHaveClass('badge-pending')
  })

  it('does not repeat the sales invoice number when it matches the AR number', () => {
    renderLoaded([overdueReceivable])
    expect(screen.queryByText(/^for /)).not.toBeInTheDocument()
  })

  it('falls back for missing fields', () => {
    renderLoaded([sparseReceivable])
    const [, row] = within(getTable()).getAllByRole('row')
    // invoice number, customer and due date
    expect(within(row!).getAllByText('—')).toHaveLength(3)
  })

  it('uses the singular for a single invoice', () => {
    renderLoaded([overdueReceivable])
    expect(screen.getByText('Outstanding customer balances · 1 invoice on this page')).toBeInTheDocument()
  })

  describe('page total', () => {
    it('sums the amount, paid and balance of the page', () => {
      renderLoaded([overdueReceivable, partialReceivable])
      const rows = within(getTable()).getAllByRole('row')
      const total = rows[rows.length - 1]!
      expect(total).toHaveClass('receivables-total-row')
      expect(within(total).getByText('Page total (2 invoices)')).toBeInTheDocument()
      expect(within(total).getByText('$38,290')).toBeInTheDocument()
      expect(within(total).getByText('$1,200')).toHaveClass('text-green')
      expect(within(total).getByText('$37,090')).toHaveClass('text-amber')
    })

    it('is not shown when the page is empty', () => {
      renderLoaded([])
      expect(screen.queryByText(/Page total/)).not.toBeInTheDocument()
    })
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No outstanding receivables found.')).toBeInTheDocument()
  })

  it('adds the clear hint when a filter is active', () => {
    renderLoaded([], withQuery({ status: 'overdue' }))
    expect(screen.getByText('No outstanding receivables found. Try clearing the filters.')).toBeInTheDocument()
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], withQuery({ pageNumber: 2 }))
    expect(screen.getByText('No more receivables on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<AccountsReceivablePage />, { preloadedState: makeReceivableState() })
    act(() => { store.dispatch(loadReceivablesFailure('The server is not responding.')) })

    expect(screen.getByText("Couldn't load receivables")).toBeInTheDocument()
    expect(screen.getByText('The server is not responding.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Accounts receivable' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadReceivables().type)).toHaveLength(2)
  })

  describe('filters', () => {
    it('offers the API\'s statuses and dispatches the chosen one', async () => {
      const { actions, user } = renderLoaded([overdueReceivable])
      const filter = screen.getByRole('combobox', { name: 'Status' })
      expect(filter).toHaveTextContent('All Status')

      await user.click(filter)
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'All Status', 'Overdue', 'Unpaid (not yet due)', 'Partial (not yet due)',
      ])
      await user.click(screen.getByRole('option', { name: 'Overdue' }))
      expect(actions).toContainEqual(setReceivableStatusFilter('overdue'))
    })

    it('offers every loaded customer and dispatches the chosen id', async () => {
      const { actions, user } = renderLoaded([overdueReceivable])
      const filter = screen.getByRole('combobox', { name: 'Customer' })
      expect(filter).toHaveTextContent('All Customers')

      await user.click(filter)
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'All Customers', 'David Taylor', 'Jennifer Brown', 'John Smith',
      ])
      await user.click(screen.getByRole('option', { name: 'Jennifer Brown' }))
      expect(actions).toContainEqual(setReceivableCustomerFilter('6'))
    })

    it('shows the selected filters', () => {
      renderLoaded([overdueReceivable], withQuery({ status: 'partial', customerId: '7' }))
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Partial (not yet due)')
      expect(screen.getByRole('combobox', { name: 'Customer' })).toHaveTextContent('David Taylor')
    })

    it('names a selected customer by id until the customers load', () => {
      renderLoaded([overdueReceivable], { ...withQuery({ customerId: '42' }), customerOptions: [] })
      expect(screen.getByRole('combobox', { name: 'Customer' })).toHaveTextContent('Customer #42')
    })

    it('dispatches the as-of date and says Today when none is set', () => {
      const { actions } = renderLoaded([overdueReceivable])
      expect(screen.getByText('Today')).toBeInTheDocument()
      fireEvent.change(screen.getByLabelText('Aging as of'), { target: { value: '2024-04-01' } })
      expect(actions).toContainEqual(setReceivableAsOfDate('2024-04-01'))
    })

    it('disables Clear until a filter is active', () => {
      renderLoaded([overdueReceivable])
      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
    })

    it('clears the filters', async () => {
      const { actions, user } = renderLoaded([overdueReceivable], withQuery({ asOfDate: '2024-04-01' }))
      expect(screen.queryByText('Today')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Clear' }))
      expect(actions).toContainEqual(resetReceivableFilters())
    })
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([overdueReceivable], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setReceivablePage(2))
  })

  it('prints the page', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const { user } = renderLoaded([overdueReceivable])
    await user.click(screen.getByRole('button', { name: 'Print' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:receivables' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([recentOverdueReceivable])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:receivables')
      const csv = await createObjectURL.mock.calls[0]?.[0]?.text()
      expect(csv).toContain('"AR Invoice","Sales Invoice","Customer","Due Date","Amount","Paid","Balance","Days Overdue","Status"')
      expect(csv).toContain('"AR-002471","INV-004262","Jennifer Brown","2026-11-08","29350","1850","27500","6","Overdue"')
    })
  })
})
