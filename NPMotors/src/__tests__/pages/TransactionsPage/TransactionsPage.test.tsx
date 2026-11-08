import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from '../../../pages/TransactionsPage/TransactionsPage'
import {
  loadTransactionAccountOptions,
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess,
  resetTransactionFilters,
  selectTransaction,
  setTransactionBankAccountFilter,
  setTransactionDateFrom,
  setTransactionDateTo,
  setTransactionDirectionFilter,
  setTransactionPage,
} from '../../../redux/transactions/transactions.actions'
import type { TransactionsState } from '../../../redux/transactions/transactions.reducer'
import { accountOptions, outgoingTransaction, sparseTransaction, transaction } from '../../../test/fixtures/transactions'
import { makeTransactionState, renderWithProviders } from '../../../test/test-utils'
import type { Transaction, TransactionQuery } from '../../../types/transactions'

// The page dispatches loadTransactions() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: Transaction[], overrides: Partial<TransactionsState> = {}, hasNext = false) {
  const result = renderWithProviders(<TransactionsPage />, { preloadedState: makeTransactionState({ accountOptions, ...overrides }) })
  act(() => { result.store.dispatch(loadTransactionsSuccess({ items, hasNext })) })
  return result
}

const withQuery = (changes: Partial<TransactionQuery>): Partial<TransactionsState> => ({
  query: { pageNumber: 1, pageSize: 5, bankAccountId: 'all', direction: 'all', dateFrom: '', dateTo: '', ...changes },
})

describe('TransactionsPage', () => {
  it('loads the transactions and the accounts on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<TransactionsPage />, { preloadedState: makeTransactionState() })
    expect(actions).toContainEqual(loadTransactions())
    expect(actions).toContainEqual(loadTransactionAccountOptions())
    expect(screen.getByText('Loading transactions…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Transactions' })).not.toBeInTheDocument()
  })

  it('shows the read-only note and has no add action', () => {
    renderLoaded([transaction])
    expect(screen.getByText('Posted transactions are read-only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument()
  })

  it('renders a row per transaction with the count, badges and signed amounts', () => {
    renderLoaded([transaction, outgoingTransaction])

    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument()
    expect(screen.getByText('Internal bank movement ledger · 2 transactions on this page')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Transactions' })
    // header row + 2 transactions
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('2026-11-08')).toBeInTheDocument()
    expect(within(table).getByText('2990')).toBeInTheDocument()
    expect(within(table).getByText('Bank Receipt')).toHaveClass('type-chip')
    expect(within(table).getByText('Vendor return')).toBeInTheDocument()
    expect(within(table).getByText('Returned from Vendor sales invoice 45')).toBeInTheDocument()

    expect(within(table).getByText('Incoming')).toHaveClass('badge-posted')
    expect(within(table).getByText('Outgoing')).toHaveClass('badge-cancelled')
    expect(within(table).getByText('+$500.00')).toHaveClass('text-green')
    expect(within(table).getByText('−$1,234.50')).toHaveClass('text-red')
    expect(within(table).getByText('Posted')).toHaveClass('badge-posted')
    expect(within(table).getByText('Reversed')).toHaveClass('badge-cancelled')
  })

  it('shows each bank account with its number from the account list', () => {
    renderLoaded([transaction, outgoingTransaction])
    const table = screen.getByRole('table', { name: 'Transactions' })
    expect(within(table).getByText('Operating Checking')).toBeInTheDocument()
    expect(within(table).getByText('****4521')).toHaveClass('mono')
    expect(within(table).getByText('****9034')).toBeInTheDocument()
  })

  it('falls back for missing fields', () => {
    renderLoaded([transaction, sparseTransaction])
    const table = screen.getByRole('table', { name: 'Transactions' })
    // sparseTransaction has no date, id, type, bank account, party, status or description
    expect(within(table).getAllByText('—')).toHaveLength(7)
    expect(within(table).getByRole('button', { name: 'Transaction' })).toBeDisabled()
  })

  it('uses the singular for a single transaction', () => {
    renderLoaded([transaction])
    expect(screen.getByText('Internal bank movement ledger · 1 transaction on this page')).toBeInTheDocument()
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No transactions found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try resetting/)).not.toBeInTheDocument()
  })

  it('adds the reset hint when a filter is active', () => {
    renderLoaded([], withQuery({ dateTo: '2024-01-01' }))
    expect(screen.getByText('No transactions found. Try resetting the filters.')).toBeInTheDocument()
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], withQuery({ pageNumber: 2 }))
    expect(screen.getByText('No more transactions on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<TransactionsPage />, { preloadedState: makeTransactionState() })
    act(() => { store.dispatch(loadTransactionsFailure('The server is not responding.')) })

    expect(screen.getByText("Couldn't load transactions")).toBeInTheDocument()
    expect(screen.getByText('The server is not responding.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Transactions' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadTransactions().type)).toHaveLength(2)
  })

  describe('filters', () => {
    it('lists every loaded account with its number after All Accounts and dispatches the chosen id', async () => {
      const { actions, user } = renderLoaded([transaction])
      const filter = screen.getByRole('combobox', { name: 'Bank Account' })
      expect(filter).toHaveTextContent('All Accounts')

      await user.click(filter)
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'All Accounts', 'Operating Checking · ****4521', 'Floor Plan Account · ****9034', 'Cash on Hand',
      ])
      await user.click(screen.getByRole('option', { name: 'Floor Plan Account · ****9034' }))
      expect(actions).toContainEqual(setTransactionBankAccountFilter('4'))
    })

    it('shows the selected account, and falls back to All Accounts when it is not loaded', () => {
      const { unmount } = renderLoaded([transaction], withQuery({ bankAccountId: '1' }))
      expect(screen.getByRole('combobox', { name: 'Bank Account' })).toHaveTextContent('Operating Checking · ****4521')
      unmount()

      renderLoaded([transaction], { accountOptions: [], ...withQuery({ bankAccountId: '9' }) })
      expect(screen.getByRole('combobox', { name: 'Bank Account' })).toHaveTextContent('All Accounts')
    })

    it('dispatches the direction filter when an option is chosen', async () => {
      const { actions, user } = renderLoaded([transaction])
      await user.click(screen.getByRole('combobox', { name: 'Direction' }))
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['All Directions', 'Incoming', 'Outgoing'])
      await user.click(screen.getByRole('option', { name: 'Outgoing' }))
      expect(actions).toContainEqual(setTransactionDirectionFilter('out'))
    })

    it('dispatches the date range and bounds each date by the other', () => {
      const { actions } = renderLoaded([transaction])
      fireEvent.change(screen.getByLabelText('From Date'), { target: { value: '2026-11-01' } })
      fireEvent.change(screen.getByLabelText('To Date'), { target: { value: '2026-11-30' } })

      expect(actions).toContainEqual(setTransactionDateFrom('2026-11-01'))
      expect(actions).toContainEqual(setTransactionDateTo('2026-11-30'))
      expect(screen.getByLabelText('From Date')).toHaveAttribute('max', '2026-11-30')
      expect(screen.getByLabelText('To Date')).toHaveAttribute('min', '2026-11-01')
    })

    it('disables Reset until a filter is active', () => {
      renderLoaded([transaction])
      expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
    })

    it('resets the filters', async () => {
      const { actions, user } = renderLoaded([transaction], withQuery({ direction: 'in', dateFrom: '2026-11-01' }))
      await user.click(screen.getByRole('button', { name: 'Reset' }))
      expect(actions).toContainEqual(resetTransactionFilters())
    })
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([transaction], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setTransactionPage(2))
  })

  it('opens a transaction from its number', async () => {
    const { actions, user } = renderLoaded([transaction])
    await user.click(screen.getByRole('button', { name: 'TXN-2026-002990' }))
    expect(actions).toContainEqual(selectTransaction('2990'))
  })

  it('renders the detail view instead of the list when a transaction is selected', () => {
    renderWithProviders(<TransactionsPage />, { preloadedState: makeTransactionState({ selectedId: '2990', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading transaction…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Transactions' })).not.toBeInTheDocument()
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:transactions' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([transaction])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:transactions')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv).toContain('"Date","Transaction #","ID","Source Type","Source #","Bank Account","Party","Direction","Amount","Status","Description"')
      expect(csv).toContain('"2026-11-08","TXN-2026-002990","2990","Bank Receipt","INV-004262","Operating Checking","Vendor return","Incoming","500","Posted","Returned from Vendor sales invoice 45"')
    })
  })
})
