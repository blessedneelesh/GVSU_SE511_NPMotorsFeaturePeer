import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TransactionDetail } from '../../../pages/TransactionsPage/TransactionDetail'
import { clearTransactionSelection, selectTransaction } from '../../../redux/transactions/transactions.actions'
import { outgoingTransaction, sparseTransaction, transaction } from '../../../test/fixtures/transactions'
import { makeTransactionState, renderWithProviders } from '../../../test/test-utils'

describe('TransactionDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<TransactionDetail />, { preloadedState: makeTransactionState({ selectedId: '2990', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading transaction…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Transaction')).toBeInTheDocument()
  })

  it('shows the error and retries the same transaction', async () => {
    const { actions, user } = renderWithProviders(<TransactionDetail />, {
      preloadedState: makeTransactionState({ selectedId: '2990', detailStatus: 'error', detailError: 'This transaction no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load transaction")).toBeInTheDocument()
    expect(screen.getByText('This transaction no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([selectTransaction('2990')])
  })

  it('renders every field and the incoming amount', () => {
    renderWithProviders(<TransactionDetail />, {
      preloadedState: makeTransactionState({ selectedId: '2990', selected: transaction, detailStatus: 'success' }),
    })

    expect(screen.getByRole('heading', { name: 'TXN-2026-002990' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('TXN-2026-002990')).toBeInTheDocument()
    expect(screen.getByText('Returned from Vendor sales invoice 45')).toBeInTheDocument()
    expect(screen.getByText('Bank Receipt')).toHaveClass('type-chip')
    expect(screen.getByText('Posted')).toHaveClass('badge-posted')
    expect(screen.getByText('2026-11-08')).toBeInTheDocument()
    expect(screen.getByText('Operating Checking')).toBeInTheDocument()
    expect(screen.getByText('Incoming')).toBeInTheDocument()
    expect(screen.getByText('Vendor return')).toBeInTheDocument()
    expect(screen.getByText('INV-004262')).toHaveClass('mono')
    expect(screen.getByText('2990')).toHaveClass('mono')
    expect(screen.getByText(/^Nov 8, 2026, 10:25\sAM · system$/)).toBeInTheDocument()
    expect(screen.getByText('+$500.00')).toHaveClass('stat-value--green')
  })

  it('shows an outgoing amount in red and a reversed status', () => {
    renderWithProviders(<TransactionDetail />, {
      preloadedState: makeTransactionState({ selectedId: '2400', selected: outgoingTransaction, detailStatus: 'success' }),
    })
    expect(screen.getByText('Outgoing')).toBeInTheDocument()
    expect(screen.getByText('−$1,234.50')).toHaveClass('stat-value--red')
    expect(screen.getByText('Reversed')).toHaveClass('badge-cancelled')
  })

  it('falls back for missing fields and hides the empty badges', () => {
    const { container } = renderWithProviders(<TransactionDetail />, {
      preloadedState: makeTransactionState({ selectedId: 'X', selected: sparseTransaction, detailStatus: 'success' }),
    })

    expect(screen.getByRole('heading', { name: 'Transaction' })).toBeInTheDocument()
    // Description, date, bank account, party, source #, transaction ID and created all fall back to '—'
    expect(screen.getAllByText('—')).toHaveLength(7)
    expect(container.querySelector('.transaction-profile__badges')).toBeEmptyDOMElement()
    expect(screen.getByText('+$0.00')).toHaveClass('stat-value--green')
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderWithProviders(<TransactionDetail />, {
      preloadedState: makeTransactionState({ selectedId: '2990', selected: transaction, detailStatus: 'success' }),
    })
    await user.click(screen.getByRole('button', { name: '← Transactions' }))
    expect(actions).toEqual([clearTransactionSelection()])
  })
})
