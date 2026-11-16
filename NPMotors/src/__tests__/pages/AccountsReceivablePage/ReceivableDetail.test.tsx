import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReceivableDetail } from '../../../pages/AccountsReceivablePage/ReceivableDetail'
import { clearReceivableSelection, selectReceivable } from '../../../redux/receivables/receivables.actions'
import {
  currentReceivableDetail,
  paidReceivableDetail,
  receivableDetail,
  sparseReceivableDetail,
} from '../../../test/fixtures/receivables'
import { makeReceivableState, renderWithProviders } from '../../../test/test-utils'
import type { ReceivableDetail as ReceivableDetailData } from '../../../types/receivables'

const renderLoaded = (selected: ReceivableDetailData) =>
  renderWithProviders(<ReceivableDetail />, {
    preloadedState: makeReceivableState({ selectedId: selected.id || 'X', selected, detailStatus: 'success' }),
  })

const stat = (label: string) => screen.getByText(label, { selector: '.receivable-hero__stats dt' }).nextElementSibling

describe('ReceivableDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<ReceivableDetail />, { preloadedState: makeReceivableState({ selectedId: '2471', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading receivable…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Receivable')).toBeInTheDocument()
  })

  it('shows the error and retries the same receivable', async () => {
    const { actions, user } = renderWithProviders(<ReceivableDetail />, {
      preloadedState: makeReceivableState({ selectedId: '9', detailStatus: 'error', detailError: 'This receivable no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load receivable")).toBeInTheDocument()
    expect(screen.getByText('This receivable no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([selectReceivable('9')])
  })

  it('renders an overdue, partly paid invoice', () => {
    renderLoaded(receivableDetail)

    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('AR-002471')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'AR-002471' })).toBeInTheDocument()
    expect(screen.getByText('Jennifer Brown · Issued 2026-11-08 · Due 2026-11-08')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toHaveClass('badge-overdue')

    expect(screen.getByText('6% collected')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Payment progress' })).toBeInTheDocument()
    expect(stat('Invoice Total')).toHaveTextContent('$29,350.00')
    expect(stat('Paid')).toHaveTextContent('$1,850.00')
    expect(stat('Balance Due')).toHaveClass('text-amber')
    expect(stat('Days Overdue')).toHaveTextContent('7d')
    expect(stat('Days Overdue')).toHaveClass('text-red')

    expect(screen.getByText('JB')).toBeInTheDocument()
    expect(screen.getByText('(972) 555-0784')).toBeInTheDocument()
    expect(screen.getByText('jbrown@email.com')).toBeInTheDocument()
    expect(screen.getByText('2240 Cedar Blvd')).toBeInTheDocument()

    expect(screen.getByText('7 days overdue')).toHaveClass('aging-30')
    expect(screen.getByText('Payment Due')).toBeInTheDocument()
    expect(screen.queryByText('Fully Settled')).not.toBeInTheDocument()
  })

  it('shows an invoice that is not yet due as current', () => {
    renderLoaded(currentReceivableDetail)

    expect(screen.getByText('Unpaid')).toHaveClass('badge-pending')
    expect(screen.getByText('0% collected')).toBeInTheDocument()
    expect(stat('Days Overdue')).toHaveTextContent('Current')
    expect(stat('Days Overdue')).toHaveClass('text-green')
    expect(screen.getByText('Current — not yet due')).toHaveClass('aging-current')
  })

  it('shows a settled invoice as settled, not overdue', () => {
    renderLoaded(paidReceivableDetail)

    expect(screen.getByText('Paid', { selector: '.badge' })).toHaveClass('badge-paid')
    expect(screen.getByText('100% collected')).toBeInTheDocument()
    expect(stat('Balance Due')).toHaveClass('text-faint')
    expect(stat('Days Overdue')).toHaveTextContent('Settled')
    expect(screen.getByText('Fully settled — nothing due')).toHaveClass('aging-current')
    expect(screen.getByText('Fully Settled')).toBeInTheDocument()
    expect(screen.queryByText('Payment Due')).not.toBeInTheDocument()
  })

  it('falls back for missing fields', () => {
    renderLoaded(sparseReceivableDetail)

    expect(screen.getByRole('heading', { level: 1, name: '—' })).toBeInTheDocument()
    expect(screen.getByText('— · Issued — · Due —')).toBeInTheDocument()
    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.getByText('0% collected')).toBeInTheDocument()
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderLoaded(receivableDetail)
    await user.click(screen.getByRole('button', { name: '← Accounts Receivable' }))
    expect(actions).toEqual([clearReceivableSelection()])
  })
})
