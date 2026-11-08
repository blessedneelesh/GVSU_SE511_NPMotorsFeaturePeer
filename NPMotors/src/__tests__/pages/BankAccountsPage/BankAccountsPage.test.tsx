import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BankAccountsPage } from '../../../pages/BankAccountsPage/BankAccountsPage'
import {
  createBankAccountSuccess,
  loadBankAccounts,
  loadBankAccountsFailure,
  loadBankAccountsSuccess,
  loadBankOptions,
  resetBankAccountSave,
  selectBankAccount,
  setBankAccountBankFilter,
  setBankAccountPage,
  setBankAccountSearch,
} from '../../../redux/bankAccounts/bankAccounts.actions'
import type { BankAccountsState } from '../../../redux/bankAccounts/bankAccounts.reducer'
import { bankAccount, bankOptions, sparseBankAccount } from '../../../test/fixtures/bankAccounts'
import { makeBankAccountState, renderWithProviders } from '../../../test/test-utils'
import type { BankAccount } from '../../../types/bankAccounts'

// The page dispatches loadBankAccounts() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: BankAccount[], overrides: Partial<BankAccountsState> = {}, hasNext = false) {
  const result = renderWithProviders(<BankAccountsPage />, { preloadedState: makeBankAccountState({ bankOptions, ...overrides }) })
  act(() => { result.store.dispatch(loadBankAccountsSuccess({ items, hasNext })) })
  return result
}

afterEach(() => {
  vi.useRealTimers()
})

describe('BankAccountsPage', () => {
  it('loads the accounts and the banks on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<BankAccountsPage />, { preloadedState: makeBankAccountState() })
    expect(actions).toContainEqual(loadBankAccounts())
    expect(actions).toContainEqual(loadBankOptions())
    expect(screen.getByText('Loading bank accounts…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Bank accounts' })).not.toBeInTheDocument()
  })

  it('renders a row per account with the count, badges and fallbacks', () => {
    renderLoaded([bankAccount, sparseBankAccount])

    expect(screen.getByRole('heading', { name: 'Banks & Accounts' })).toBeInTheDocument()
    expect(screen.getByText('2 accounts on this page')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Bank accounts' })
    // header row + 2 accounts
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('Chase Bank')).toBeInTheDocument()
    expect(within(table).getByText('****4521')).toHaveClass('mono')
    expect(within(table).getByText('Checking')).toBeInTheDocument()
    expect(within(table).getByText('021000021')).toBeInTheDocument()
    expect(within(table).getByText('$262,733')).toHaveClass('num')
    expect(within(table).getByText('$0')).toBeInTheDocument()
    expect(within(table).getByText('Active')).toHaveClass('badge-posted')
    expect(within(table).getByText('Inactive')).toHaveClass('badge-cancelled')
    // sparseBankAccount has no bank, account number, type or routing
    expect(within(table).getAllByText('—')).toHaveLength(4)
  })

  it('uses the singular for a single account', () => {
    renderLoaded([bankAccount])
    expect(screen.getByText('1 account on this page')).toBeInTheDocument()
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No bank accounts found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try clearing/)).not.toBeInTheDocument()
  })

  it('adds the clear-filters hint when a filter is active', () => {
    renderLoaded([], { query: { pageNumber: 1, pageSize: 5, bankId: '1', searchTerm: '' } })
    expect(screen.getByText('No bank accounts found. Try clearing the search or bank filter.')).toBeInTheDocument()
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], { query: { pageNumber: 2, pageSize: 5, bankId: 'all', searchTerm: '' } })
    expect(screen.getByText('No more bank accounts on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<BankAccountsPage />, { preloadedState: makeBankAccountState() })
    act(() => { store.dispatch(loadBankAccountsFailure('The server is not responding.')) })

    expect(screen.getByText("Couldn't load bank accounts")).toBeInTheDocument()
    expect(screen.getByText('The server is not responding.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Bank accounts' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadBankAccounts().type)).toHaveLength(2)
  })

  it('dispatches the search term after the debounce delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { actions } = renderLoaded([bankAccount])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.type(screen.getByRole('searchbox', { name: 'Search bank accounts' }), '  chase ')
    expect(actions).not.toContainEqual(setBankAccountSearch('chase'))

    act(() => { vi.advanceTimersByTime(300) })
    expect(actions).toContainEqual(setBankAccountSearch('chase'))
  })

  describe('bank filter', () => {
    it('lists every loaded bank after All Banks and dispatches the chosen bank id', async () => {
      const { actions, user } = renderLoaded([bankAccount])
      const filter = screen.getByRole('combobox', { name: 'Filter by bank' })
      expect(filter).toHaveTextContent('All Banks')

      await user.click(filter)
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['All Banks', 'Bank of America', 'Chase Bank'])
      await user.click(screen.getByRole('option', { name: 'Chase Bank' }))
      expect(actions).toContainEqual(setBankAccountBankFilter('1'))
    })

    it('shows the name of the selected bank', () => {
      renderLoaded([bankAccount], { query: { pageNumber: 1, pageSize: 5, bankId: '2', searchTerm: '' } })
      expect(screen.getByRole('combobox', { name: 'Filter by bank' })).toHaveTextContent('Bank of America')
    })

    it('falls back to All Banks when the selected bank is not loaded', () => {
      renderLoaded([bankAccount], { bankOptions: [], query: { pageNumber: 1, pageSize: 5, bankId: '9', searchTerm: '' } })
      expect(screen.getByRole('combobox', { name: 'Filter by bank' })).toHaveTextContent('All Banks')
    })
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([bankAccount], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setBankAccountPage(2))
  })

  it('opens an account from its name, and disables the link when there is no id', async () => {
    const { actions, user } = renderLoaded([bankAccount, sparseBankAccount])
    expect(screen.getByRole('button', { name: 'Petty Cash' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Operating Checking' }))
    expect(actions).toContainEqual(selectBankAccount('1'))
  })

  it('opens an account from the View action', async () => {
    const { actions, user } = renderLoaded([bankAccount, sparseBankAccount])
    expect(screen.getByRole('button', { name: 'View Petty Cash' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'View Operating Checking' }))
    expect(actions).toContainEqual(selectBankAccount('1'))
  })

  it('renders the detail view instead of the list when an account is selected', () => {
    renderWithProviders(<BankAccountsPage />, { preloadedState: makeBankAccountState({ selectedId: '1', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading bank account…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Banks & Accounts' })).not.toBeInTheDocument()
  })

  describe('Add Bank Account', () => {
    it('resets the save state and opens the dialog', async () => {
      const { actions, user } = renderLoaded([bankAccount])
      await user.click(screen.getByRole('button', { name: 'Add Bank Account' }))

      expect(actions).toContainEqual(resetBankAccountSave())
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(within(screen.getByRole('dialog')).getByText('Add Bank Account')).toBeInTheDocument()
    })

    it('closes the dialog on Cancel', async () => {
      const { user } = renderLoaded([bankAccount])
      await user.click(screen.getByRole('button', { name: 'Add Bank Account' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('swaps the dialog for the success banner, which hides itself after 4 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { store } = renderLoaded([bankAccount])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByRole('button', { name: 'Add Bank Account' }))

      act(() => { store.dispatch(createBankAccountSuccess()) })
      expect(screen.getByText('Bank account added successfully.')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByText('Bank account added successfully.')).not.toBeInTheDocument()
      expect(store.getState().bankAccounts.saveStatus).toBe('idle')
    })

    it('dismisses the success banner', async () => {
      const { store, user } = renderLoaded([bankAccount])
      await user.click(screen.getByRole('button', { name: 'Add Bank Account' }))
      act(() => { store.dispatch(createBankAccountSuccess()) })

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText('Bank account added successfully.')).not.toBeInTheDocument()
    })
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:bankAccounts' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([bankAccount])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:bankAccounts')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv).toContain('"ID","Account Name","Bank","Account Number","Type","Routing","Balance","Status"')
      expect(csv).toContain('"1","Operating Checking","Chase Bank","****4521","Checking","021000021","262733","Active"')
    })
  })
})
