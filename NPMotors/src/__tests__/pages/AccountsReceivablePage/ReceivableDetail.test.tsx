import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReceivableDetail } from '../../../pages/AccountsReceivablePage/ReceivableDetail'
import { clearReceivableSelection, selectReceivable } from '../../../redux/receivables/receivables.actions'
import {
  clearPaymentHistory,
  loadPaymentHistory,
  loadPaymentHistoryFailure,
  loadPaymentHistorySuccess,
  resetReceiptSave,
} from '../../../redux/receipts/receipts.actions'
import { receiptPayments } from '../../../test/fixtures/receipts'
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

// Opening the invoice dispatches the history load; with no saga running, tests dispatch the answer themselves
const answerHistory = (store: { dispatch: (action: ReturnType<typeof loadPaymentHistorySuccess>) => unknown }, arInvoiceId: string, payments = receiptPayments) => {
  act(() => { store.dispatch(loadPaymentHistorySuccess({ arInvoiceId, payments })) })
}

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
    expect(actions).toEqual([loadPaymentHistory('9'), selectReceivable('9')])
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

  it('offers Receive Payment on an invoice with a balance and opens the dialog', async () => {
    const { actions, user } = renderLoaded(receivableDetail)
    const buttons = screen.getAllByRole('button', { name: 'Receive Payment' })
    // In the header, the Payment History card and the Summary card
    expect(buttons).toHaveLength(3)

    await user.click(buttons[0]!)
    expect(actions).toContainEqual(resetReceiptSave())
    const dialog = screen.getByRole('dialog', { name: 'Receive Payment' })
    expect(within(dialog).getByText('AR-002471 · Jennifer Brown')).toBeInTheDocument()
  })

  it.each([
    ['a not-yet-due unpaid invoice', currentReceivableDetail, 3],
    ['a paid invoice', paidReceivableDetail, 0],
    ['an "unpaid" invoice with nothing left to pay', { ...currentReceivableDetail, balance: 0 }, 0],
  ])('shows %s with %i Receive Payment buttons', (_, detail, count) => {
    renderLoaded(detail)
    expect(screen.queryAllByRole('button', { name: 'Receive Payment' })).toHaveLength(count)
  })

  it('keeps the dialog open while the invoice reloads after a payment', async () => {
    const { store, user } = renderLoaded(receivableDetail)
    await user.click(screen.getAllByRole('button', { name: 'Receive Payment' })[0]!)

    // What the saga does after a successful payment: reload the open invoice
    act(() => { store.dispatch(selectReceivable('2471')) })
    expect(screen.getByText('Loading receivable…')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Receive Payment' })).toBeInTheDocument()
  })

  it('loads the payment history of the open invoice and lists it newest first', () => {
    const { actions, store } = renderLoaded(receivableDetail)
    expect(actions).toEqual([loadPaymentHistory('2471')])
    expect(screen.getByText('Loading payments…')).toBeInTheDocument()

    answerHistory(store, '2471')
    const rows = within(screen.getByRole('table', { name: 'Payment history' })).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[1]!.textContent)).toEqual(['RCT-2026-000462', 'RCT-2026-000461'])
    expect(within(rows[0]!).getByText('Bank Transfer')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Business Savings')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('—')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Check')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('INV-004262')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('$1,200.00')).toHaveClass('text-green')
  })

  it('adds each payment to the timeline, oldest first, before the due date', () => {
    const { store } = renderLoaded(receivableDetail)
    answerHistory(store, '2471')
    const steps = within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)
    expect(steps).toEqual([
      'Invoice Created2026-11-08',
      'Payment Received — $1,200.002026-11-08',
      'Payment Received — $650.002026-11-10',
      'Payment Due2026-11-08',
    ])
  })

  it('greys out a reversed receipt in the table and the timeline', () => {
    const { store } = renderLoaded(receivableDetail)
    const [first, second] = receiptPayments
    answerHistory(store, '2471', [first!, { ...second!, status: 'Reversed' }])

    const [reversed, posted] = within(screen.getByRole('table', { name: 'Payment history' })).getAllByRole('row').slice(1)
    expect(reversed).toHaveClass('payment-row--reversed')
    expect(within(reversed!).getAllByRole('cell')[1]).toHaveTextContent('RCT-2026-000462Reversed')
    expect(posted).not.toHaveClass('payment-row--reversed')

    const steps = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(steps[2]).toHaveTextContent('Payment Reversed — $650.00')
    expect(steps[2]).not.toHaveClass('is-done')
    expect(steps[1]).toHaveTextContent('Payment Received — $1,200.00')
    expect(steps[1]).toHaveClass('is-done')
  })

  it('dates Fully Settled with the last receipt that was not reversed', () => {
    const { store } = renderLoaded(paidReceivableDetail)
    const [first, second] = receiptPayments
    answerHistory(store, '4', [{ ...first!, receiptDate: '2026-11-12' }, { ...second!, receiptDate: '2026-11-20', status: 'Reversed' }])
    expect(screen.getByText('Fully Settled').nextElementSibling).toHaveTextContent('2026-11-12')
  })

  it('dates Fully Settled with the last payment', () => {
    const { store } = renderLoaded(paidReceivableDetail)
    answerHistory(store, '4', [{ ...receiptPayments[0]!, receiptDate: '2026-11-12' }])
    expect(screen.getByText('Fully Settled').nextElementSibling).toHaveTextContent('2026-11-12')
  })

  it('says when no payments have been recorded', () => {
    const { store } = renderLoaded(currentReceivableDetail)
    answerHistory(store, '3974', [])
    expect(screen.getByText('No payments recorded yet')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Payment history' })).not.toBeInTheDocument()
  })

  it('shows when the payments failed to load and retries', async () => {
    const { actions, store, user } = renderLoaded(receivableDetail)
    act(() => { store.dispatch(loadPaymentHistoryFailure('Payment history could not be loaded. Please try again.')) })
    expect(screen.getByText("Couldn't load payments")).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadPaymentHistory('2471').type)).toEqual([loadPaymentHistory('2471'), loadPaymentHistory('2471')])
  })

  it('keeps the listed payments while they reload after a payment', () => {
    const { store } = renderLoaded(receivableDetail)
    answerHistory(store, '2471')
    act(() => { store.dispatch(loadPaymentHistory('2471')) })
    expect(screen.getByRole('table', { name: 'Payment history' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('RCT-2026-000461')).toBeInTheDocument()
  })

  it('forgets the payments when the invoice is closed', () => {
    const { actions, unmount } = renderLoaded(receivableDetail)
    unmount()
    expect(actions).toEqual([loadPaymentHistory('2471'), clearPaymentHistory()])
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderLoaded(receivableDetail)
    await user.click(screen.getByRole('button', { name: '← Accounts Receivable' }))
    // Clearing the selection also forgets the invoice's payments
    expect(actions).toEqual([loadPaymentHistory('2471'), clearReceivableSelection(), clearPaymentHistory()])
  })
})
