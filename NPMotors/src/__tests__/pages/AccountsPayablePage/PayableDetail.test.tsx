import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PayableDetail } from '../../../pages/AccountsPayablePage/PayableDetail'
import {
  clearPayablePaymentHistory,
  clearPayableSelection,
  loadPayablePaymentHistory,
  loadPayablePaymentHistoryFailure,
  loadPayablePaymentHistorySuccess,
  selectPayable,
} from '../../../redux/payables/payables.actions'
import {
  overduePayableDetail,
  paidPayableDetail,
  partialPayableDetail,
  payablePayments,
  sparsePayableDetail,
} from '../../../test/fixtures/payables'
import { makePayableState, renderWithProviders } from '../../../test/test-utils'
import type { PayableDetail as PayableDetailData } from '../../../types/payables'

const renderLoaded = (selected: PayableDetailData) =>
  renderWithProviders(<PayableDetail />, {
    preloadedState: makePayableState({ selectedId: selected.id || 'X', selected, detailStatus: 'success' }),
  })

// Opening the bill dispatches the history load; with no saga running, tests dispatch the answer themselves
const answerHistory = (store: { dispatch: (action: ReturnType<typeof loadPayablePaymentHistorySuccess>) => unknown }, apBillId: string, payments = payablePayments) => {
  act(() => { store.dispatch(loadPayablePaymentHistorySuccess({ apBillId, payments })) })
}

const stat = (label: string) => screen.getByText(label, { selector: '.payable-hero__stats dt' }).nextElementSibling
const fact = (label: string) => screen.getByText(label, { selector: '.payable-vendor__facts dt' }).nextElementSibling

describe('PayableDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<PayableDetail />, { preloadedState: makePayableState({ selectedId: '4', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading bill…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Bill')).toBeInTheDocument()
  })

  it('shows the error and retries the same bill', async () => {
    const { actions, user } = renderWithProviders(<PayableDetail />, {
      preloadedState: makePayableState({ selectedId: '9', detailStatus: 'error', detailError: 'This bill no longer exists.' }),
    })
    expect(screen.getByText("Couldn't load bill")).toBeInTheDocument()
    expect(screen.getByText('This bill no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([loadPayablePaymentHistory('9'), selectPayable('9')])
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderLoaded(overduePayableDetail)
    await user.click(screen.getByRole('button', { name: '← Accounts Payable' }))
    // Closing the bill also forgets its payments
    expect(actions).toEqual([loadPayablePaymentHistory('4'), clearPayableSelection(), clearPayablePaymentHistory()])
  })

  it('renders an overdue, unpaid bill', () => {
    renderLoaded(overduePayableDetail)

    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('BILL-0020')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'BILL-0020' })).toBeInTheDocument()
    expect(screen.getByText('Honda Auto Parts · Issued 2024-03-12 · Due 2024-04-26')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toHaveClass('badge-overdue')
    expect(screen.getByText('0% paid')).toBeInTheDocument()

    expect(stat('Bill Total')).toHaveTextContent('$12,400.00')
    expect(stat('Paid')).toHaveTextContent('$0.00')
    expect(stat('Balance Due')).toHaveClass('text-red')
    expect(stat('Days Overdue')).toHaveTextContent('943d')

    expect(fact('Contact')).toHaveTextContent('Sam Nguyen')
    expect(fact('Phone')).toHaveTextContent('(800) 555-0312')
    expect(fact('Email')).toHaveTextContent('parts@honda.com')
    expect(fact('Address')).toHaveTextContent('700 Parts Ave, Columbus OH')
    // A parts bill has no vehicle
    expect(screen.queryByText('Vehicle', { selector: 'dt' })).not.toBeInTheDocument()

    expect(screen.getByText('943 days overdue')).toHaveClass('aging-box', 'aging-over-60')
    expect(screen.getByText('Payment Due')).toBeInTheDocument()
    expect(screen.queryByText(/Partial Payment/)).not.toBeInTheDocument()
  })

  it('has no accounting entry section', () => {
    renderLoaded(overduePayableDetail)
    expect(screen.queryByText('Accounting Entry')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders a partly paid vehicle bill that is not yet due', () => {
    renderLoaded(partialPayableDetail)
    expect(screen.getByText('Partial')).toHaveClass('badge-partial')
    expect(screen.getByText('10% paid')).toBeInTheDocument()
    expect(stat('Days Overdue')).toHaveTextContent('Current')
    expect(fact('Vehicle')).toHaveTextContent('Vehicle #1807')
    expect(screen.getByText('Current — not yet due')).toHaveClass('aging-current')
  })

  describe('payment history', () => {
    it('loads the payments of the open bill and forgets them when it closes', () => {
      const { actions, unmount } = renderLoaded(partialPayableDetail)
      expect(actions).toEqual([loadPayablePaymentHistory('11')])
      expect(screen.getByText('Loading payments…')).toBeInTheDocument()
      unmount()
      expect(actions).toEqual([loadPayablePaymentHistory('11'), clearPayablePaymentHistory()])
    })

    it('lists the payments newest first, and adds each to the timeline in date order', () => {
      const { store } = renderLoaded({ ...partialPayableDetail, id: '10' })
      answerHistory(store, '10')

      const rows = within(screen.getByRole('table', { name: 'Payment history' })).getAllByRole('row')
      expect(within(rows[0]!).getAllByRole('columnheader').map((cell) => cell.textContent))
        .toEqual(['Date', 'Payment #', 'Method', 'Reference', 'Amount'])
      expect(rows[1]).toHaveTextContent('2026-11-25PAY-2026-000009Checkstring$500.00')
      expect(rows[2]).toHaveTextContent('2026-11-23PAY-2026-000008Credit Cardstring$5,000.00')
      expect(within(rows[1]!).getByText('$500.00')).toHaveClass('text-red')

      const steps = within(screen.getByText('Timeline').parentElement!).getAllByRole('listitem').map((item) => item.textContent)
      expect(steps).toEqual([
        'Bill Received2026-11-25',
        'Payment Made — $5,000.002026-11-23',
        'Payment Made — $500.002026-11-25',
        'Payment Due2026-11-30',
      ])
    })

    it('dates the settlement with the last payment', () => {
      const { store } = renderLoaded(paidPayableDetail)
      answerHistory(store, '11')
      expect(screen.getByText('Fully Settled').nextElementSibling).toHaveTextContent('2026-11-25')
    })

    it('says when no payments are recorded', () => {
      const { store } = renderLoaded(overduePayableDetail)
      answerHistory(store, '4', [])
      expect(screen.getByText('No payments recorded yet')).toBeInTheDocument()
      expect(screen.queryByRole('table', { name: 'Payment history' })).not.toBeInTheDocument()
    })

    it('shows the error and retries the history only', async () => {
      const { store, actions, user } = renderLoaded(overduePayableDetail)
      act(() => { store.dispatch(loadPayablePaymentHistoryFailure('Payment history could not be loaded. Please try again.')) })

      expect(screen.getByText("Couldn't load payments")).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Retry' }))
      expect(actions.filter((action) => action.type === loadPayablePaymentHistory('4').type)).toHaveLength(2)
      expect(actions).not.toContainEqual(selectPayable('4'))
    })
  })

  it('shows a settled bill as fully settled', () => {
    renderLoaded(paidPayableDetail)
    expect(screen.getByText('Paid', { selector: '.badge' })).toHaveClass('badge-paid')
    expect(stat('Balance Due')).toHaveClass('text-faint')
    expect(stat('Days Overdue')).toHaveTextContent('Settled')
    expect(screen.getByText('Fully settled — nothing due')).toHaveClass('aging-current')
    expect(screen.getByText('Fully Settled')).toBeInTheDocument()
    expect(screen.queryByText('Payment Due')).not.toBeInTheDocument()
  })

  it('falls back for missing fields', () => {
    renderLoaded(sparsePayableDetail)
    expect(screen.getByRole('heading', { level: 1, name: '—' })).toBeInTheDocument()
    expect(fact('Name')).toHaveTextContent('—')
    expect(fact('Contact')).toHaveTextContent('—')
  })
})
