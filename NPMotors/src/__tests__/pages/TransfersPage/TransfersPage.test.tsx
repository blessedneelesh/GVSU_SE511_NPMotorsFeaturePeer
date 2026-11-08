import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TransfersPage } from '../../../pages/TransfersPage/TransfersPage'
import { createTransferSuccess, loadTransferAccountOptions, resetTransferSave } from '../../../redux/transfers/transfers.actions'
import { accountOptions } from '../../../test/fixtures/transfers'
import { makeTransferState, renderWithProviders } from '../../../test/test-utils'

const renderPage = () =>
  renderWithProviders(<TransfersPage />, { preloadedState: makeTransferState({ accountOptions, accountOptionsStatus: 'success' }) })

const banner = () => screen.queryByText('Transfer posted')

afterEach(() => {
  vi.useRealTimers()
})

describe('TransfersPage', () => {
  it('renders the header and the transfer form', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Bank Transfers' })).toBeInTheDocument()
    expect(screen.getByText('Move funds between active accounts')).toBeInTheDocument()
    expect(screen.getByText('One transfer posts two linked transactions')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New Transfer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Post Transfer' })).toBeInTheDocument()
  })

  it('clears any old save status and loads the accounts on mount', () => {
    const { actions } = renderPage()
    expect(actions).toContainEqual(resetTransferSave())
    expect(actions).toContainEqual(loadTransferAccountOptions())
  })

  it('does not show a stale success banner from an earlier visit', () => {
    renderWithProviders(<TransfersPage />, { preloadedState: makeTransferState({ accountOptions, saveStatus: 'success' }) })
    expect(banner()).not.toBeInTheDocument()
  })

  it('has no transfer history table until a GetAllTransfers endpoint exists', () => {
    renderPage()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('clears the save status when the page is left', () => {
    const { actions, unmount } = renderPage()
    const before = actions.filter((action) => action.type === resetTransferSave().type).length
    unmount()
    expect(actions.filter((action) => action.type === resetTransferSave().type)).toHaveLength(before + 1)
  })

  describe('success banner', () => {
    it('shows after a successful post and hides itself after 4 seconds', () => {
      vi.useFakeTimers()
      const { store } = renderPage()
      act(() => { store.dispatch(createTransferSuccess()) })

      expect(banner()).toBeInTheDocument()
      expect(screen.getByText('The account balances have been updated.')).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(3999) })
      expect(banner()).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(1) })
      expect(banner()).not.toBeInTheDocument()
      expect(store.getState().transfers.saveStatus).toBe('idle')
    })

    it('can be dismissed', async () => {
      const { store, user } = renderPage()
      act(() => { store.dispatch(createTransferSuccess()) })

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(banner()).not.toBeInTheDocument()
    })
  })
})
