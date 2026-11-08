import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BankAccountDetail } from '../../../pages/BankAccountsPage/BankAccountDetail'
import { clearBankAccountSelection, selectBankAccount } from '../../../redux/bankAccounts/bankAccounts.actions'
import { bankAccount, sparseBankAccount } from '../../../test/fixtures/bankAccounts'
import { makeBankAccountState, renderWithProviders } from '../../../test/test-utils'

describe('BankAccountDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<BankAccountDetail />, { preloadedState: makeBankAccountState({ selectedId: '1', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading bank account…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Bank Account')).toBeInTheDocument()
  })

  it('shows the error and retries the same account', async () => {
    const { actions, user } = renderWithProviders(<BankAccountDetail />, {
      preloadedState: makeBankAccountState({ selectedId: '1', detailStatus: 'error', detailError: 'This bank account no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load bank account")).toBeInTheDocument()
    expect(screen.getByText('This bank account no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([selectBankAccount('1')])
  })

  it('renders the profile and the book balance', () => {
    renderWithProviders(<BankAccountDetail />, {
      preloadedState: makeBankAccountState({ selectedId: '1', selected: bankAccount, detailStatus: 'success' }),
    })

    expect(screen.getByRole('heading', { name: 'Operating Checking' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Operating Checking')).toBeInTheDocument()
    expect(screen.getByText('Chase Bank')).toBeInTheDocument()
    expect(screen.getByText('****4521')).toHaveClass('mono')
    expect(screen.getByText('021000021')).toBeInTheDocument()
    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Active')).toHaveClass('badge-posted')
    expect(screen.getByText('$262,733')).toHaveClass('stat-value--blue')
  })

  it('shows an overdrawn balance in red', () => {
    renderWithProviders(<BankAccountDetail />, {
      preloadedState: makeBankAccountState({ selectedId: '1', selected: { ...bankAccount, bookBalance: -500 }, detailStatus: 'success' }),
    })
    expect(screen.getByText('-$500')).toHaveClass('stat-value--red')
  })

  it('falls back for missing fields', () => {
    renderWithProviders(<BankAccountDetail />, {
      preloadedState: makeBankAccountState({ selectedId: 'X', selected: sparseBankAccount, detailStatus: 'success' }),
    })

    // Bank, account number, routing, type and account ID all fall back to '—'
    expect(screen.getAllByText('—')).toHaveLength(5)
    expect(screen.getByText('Inactive')).toHaveClass('badge-cancelled')
    expect(screen.getByText('$0')).toHaveClass('stat-value--blue')
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderWithProviders(<BankAccountDetail />, {
      preloadedState: makeBankAccountState({ selectedId: '1', selected: bankAccount, detailStatus: 'success' }),
    })
    await user.click(screen.getByRole('button', { name: '← Banks & Accounts' }))
    expect(actions).toEqual([clearBankAccountSelection()])
  })
})
