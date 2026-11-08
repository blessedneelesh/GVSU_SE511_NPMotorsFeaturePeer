import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatementLinesPage } from '../../../pages/StatementLinesPage/StatementLinesPage'
import {
  loadStatementLineAccountOptions,
  loadStatementLines,
  loadStatementLinesFailure,
  loadStatementLinesSuccess,
  resetStatementLineFilters,
  setStatementLineBankAccountFilter,
  setStatementLineMonthFilter,
  setStatementLinePage,
  setStatementLineTypeFilter,
} from '../../../redux/statementLines/statementLines.actions'
import type { StatementLinesState } from '../../../redux/statementLines/statementLines.reducer'
import { depositLine, sparseLine, statementAccountOptions, unmatchedLine, withdrawalLine } from '../../../test/fixtures/statementLines'
import { makeStatementLineState, renderWithProviders } from '../../../test/test-utils'
import type { StatementLine, StatementLineQuery } from '../../../types/statementLines'

// The page dispatches loadStatementLines() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: StatementLine[], overrides: Partial<StatementLinesState> = {}, hasNext = false) {
  const result = renderWithProviders(<StatementLinesPage />, {
    preloadedState: makeStatementLineState({ accountOptions: statementAccountOptions, ...overrides }),
  })
  act(() => { result.store.dispatch(loadStatementLinesSuccess({ items, hasNext })) })
  return result
}

const withQuery = (changes: Partial<StatementLineQuery>): Partial<StatementLinesState> => ({
  query: { pageNumber: 1, pageSize: 5, bankAccountId: 'all', month: '', type: 'all', ...changes },
})

const getTable = () => screen.getByRole('table', { name: 'Bank statement' })

describe('StatementLinesPage', () => {
  it('loads the statement lines and the accounts on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<StatementLinesPage />, { preloadedState: makeStatementLineState() })
    expect(actions).toContainEqual(loadStatementLines())
    expect(actions).toContainEqual(loadStatementLineAccountOptions())
    expect(screen.getByText('Loading bank statement…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Bank statement' })).not.toBeInTheDocument()
  })

  it('renders a row per line with the count, chips, amounts and badges', () => {
    renderLoaded([depositLine, withdrawalLine, unmatchedLine])

    expect(screen.getByRole('heading', { name: 'Bank Statement' })).toBeInTheDocument()
    expect(screen.getByText('Simulated bank feed · 3 lines on this page')).toBeInTheDocument()
    const table = getTable()
    // header row + 3 lines + the total row
    expect(within(table).getAllByRole('row')).toHaveLength(5)
    expect(within(table).getByText('2024-03-01')).toBeInTheDocument()
    expect(within(table).getByText('BR-2024-0001')).toHaveClass('mono')
    expect(within(table).getByText('Full payment for SI-0001')).toBeInTheDocument()
    expect(within(table).getByText('John Smith')).toBeInTheDocument()

    expect(within(table).getByText('Bank Receipt')).toHaveClass('type-chip', 'type-chip--green')
    expect(within(table).getByText('Bank Payment')).toHaveClass('type-chip', 'type-chip--red')
    expect(within(table).getByText('Adjustment')).toHaveClass('type-chip')

    const [, depositRow, withdrawalRow] = within(table).getAllByRole('row')
    expect(within(depositRow!).getByText('$28,314.00')).toHaveClass('text-green')
    expect(within(depositRow!).getByText('$278,314.00')).toBeInTheDocument()
    expect(within(withdrawalRow!).getByText('$84,000.00')).toHaveClass('text-red')

    expect(within(table).getAllByText('Cleared')[0]).toHaveClass('badge-posted')
    expect(within(table).getAllByText('Matched')[0]).toHaveClass('badge-approved')
    expect(within(table).getByText('Pending')).toHaveClass('badge-pending')
    expect(within(table).getByText('Unmatched')).toHaveClass('badge-pending')
  })

  it('names each line\'s account while every account is shown', () => {
    renderLoaded([depositLine, unmatchedLine])
    const table = getTable()
    expect(within(table).getByText('Operating Checking')).toHaveClass('text-faint')
    expect(within(table).getByText('Floor Plan Account')).toBeInTheDocument()
  })

  it('falls back for missing fields', () => {
    renderLoaded([sparseLine])
    const [, row] = within(getTable()).getAllByRole('row')
    // date, reference, description, party, type, debit, credit and status
    expect(within(row!).getAllByText('—')).toHaveLength(8)
  })

  it('uses the singular for a single line', () => {
    renderLoaded([depositLine])
    expect(screen.getByText('Simulated bank feed · 1 line on this page')).toBeInTheDocument()
  })

  describe('page total', () => {
    it('sums the page and leaves the balance empty across every account', () => {
      renderLoaded([depositLine, withdrawalLine])
      const rows = within(getTable()).getAllByRole('row')
      const total = rows[rows.length - 1]!
      expect(total).toHaveClass('statement-total-row')
      expect(within(total).getByText('Page total (2 rows)')).toBeInTheDocument()
      expect(within(total).getByText('$28,314.00')).toBeInTheDocument()
      expect(within(total).getByText('$84,000.00')).toBeInTheDocument()
      expect(within(total).getByText('—')).toBeInTheDocument()
    })

    it('names the account and shows the last running balance when one account is selected', () => {
      renderLoaded([depositLine, withdrawalLine], withQuery({ bankAccountId: '1' }))
      const rows = within(getTable()).getAllByRole('row')
      const total = rows[rows.length - 1]!
      expect(within(total).getByText('Page total — Operating Checking (2 rows)')).toBeInTheDocument()
      expect(within(total).getByText('$194,314.00')).toBeInTheDocument()
    })

    it('is not shown when the page is empty', () => {
      renderLoaded([])
      expect(screen.queryByText(/Page total/)).not.toBeInTheDocument()
    })
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No statement lines found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try clearing/)).not.toBeInTheDocument()
  })

  it('adds the clear hint when a filter is active', () => {
    renderLoaded([], withQuery({ month: '2024-04' }))
    expect(screen.getByText('No statement lines found. Try clearing the filters.')).toBeInTheDocument()
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], withQuery({ pageNumber: 2 }))
    expect(screen.getByText('No more statement lines on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<StatementLinesPage />, { preloadedState: makeStatementLineState() })
    act(() => { store.dispatch(loadStatementLinesFailure('The server is not responding.')) })

    expect(screen.getByText("Couldn't load the bank statement")).toBeInTheDocument()
    expect(screen.getByText('The server is not responding.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Bank statement' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadStatementLines().type)).toHaveLength(2)
  })

  describe('account tabs', () => {
    it('shows All Accounts and every loaded account, with All Accounts selected', () => {
      renderLoaded([depositLine])
      const tabs = within(screen.getByRole('tablist', { name: 'Bank accounts' })).getAllByRole('tab')
      // Fluent repeats each tab's content in a hidden copy that reserves the selected (bold) width, so read the first one
      const tabText = (tab: HTMLElement) => [
        tab.querySelector('.statement-account-tab__name')?.textContent,
        tab.querySelector('.statement-account-tab__number')?.textContent,
      ]
      expect(tabs.map(tabText)).toEqual([
        ['All Accounts', 'Every account'], ['Operating Checking', '****4521'], ['Floor Plan Account', '****9034'], ['Cash on Hand', '—'],
      ])
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
      expect(screen.queryByRole('region', { name: 'Account summary' })).not.toBeInTheDocument()
    })

    it('dispatches the chosen account', async () => {
      const { actions, user } = renderLoaded([depositLine])
      await user.click(screen.getByRole('tab', { name: /Floor Plan Account/ }))
      expect(actions).toContainEqual(setStatementLineBankAccountFilter('4'))
    })

    it('shows the selected account\'s summary', () => {
      renderLoaded([depositLine], withQuery({ bankAccountId: '1' }))
      expect(screen.getByRole('tab', { name: /Operating Checking/ })).toHaveAttribute('aria-selected', 'true')
      const summary = screen.getByRole('region', { name: 'Account summary' })
      expect(within(summary).getByText('Operating Checking')).toBeInTheDocument()
      expect(within(summary).getByText('Chase Bank · ****4521 · Checking')).toBeInTheDocument()
      expect(within(summary).getByText('Routing: 021000021')).toBeInTheDocument()
      expect(within(summary).getByText('$250,000.00')).toBeInTheDocument()
    })

    it('leaves out an empty routing number', () => {
      renderLoaded([depositLine], withQuery({ bankAccountId: '4' }))
      const summary = screen.getByRole('region', { name: 'Account summary' })
      expect(within(summary).queryByText(/Routing/)).not.toBeInTheDocument()
    })

    it('does not name the account on each row once one account is selected', () => {
      renderLoaded([depositLine], withQuery({ bankAccountId: '1' }))
      expect(within(getTable()).queryByText('Operating Checking')).not.toBeInTheDocument()
    })
  })

  describe('filters', () => {
    it('dispatches the month', () => {
      const { actions } = renderLoaded([depositLine])
      fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2024-03' } })
      expect(actions).toContainEqual(setStatementLineMonthFilter('2024-03'))
    })

    it('offers the API\'s types and dispatches the chosen enum name', async () => {
      const { actions, user } = renderLoaded([depositLine])
      const filter = screen.getByRole('combobox', { name: 'Type' })
      expect(filter).toHaveTextContent('All Types')

      await user.click(filter)
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'All Types', 'Bank Receipt', 'Bank Payment', 'Transfer', 'Bank Interest', 'Bank Charge', 'Payroll', 'Reversal',
      ])
      await user.click(screen.getByRole('option', { name: 'Bank Payment' }))
      expect(actions).toContainEqual(setStatementLineTypeFilter('BankPayment'))
    })

    it('shows the selected type', () => {
      renderLoaded([depositLine], withQuery({ type: 'Transfer' }))
      expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Transfer')
    })

    it('disables Clear until a filter is active', () => {
      renderLoaded([depositLine], withQuery({ bankAccountId: '1' }))
      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
    })

    it('clears the filters', async () => {
      const { actions, user } = renderLoaded([depositLine], withQuery({ month: '2024-03', type: 'Transfer' }))
      await user.click(screen.getByRole('button', { name: 'Clear' }))
      expect(actions).toContainEqual(resetStatementLineFilters())
    })
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([depositLine], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setStatementLinePage(2))
  })

  it('prints the page', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const { user } = renderLoaded([depositLine])
    await user.click(screen.getByRole('button', { name: 'Print' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  describe('Export CSV', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
    })

    it('downloads the current rows as CSV', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:statement' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([depositLine])

      await user.click(screen.getByRole('button', { name: 'Export CSV' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:statement')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv).toContain('"Date","Reference","Description","Party","Type","Bank Account","Debit (In)","Credit (Out)","Balance","Statement Status","Match Status"')
      expect(csv).toContain('"2024-03-01","BR-2024-0001","Full payment for SI-0001","John Smith","Bank Receipt","Operating Checking","28314","0","278314","Cleared","Matched"')
    })
  })
})
