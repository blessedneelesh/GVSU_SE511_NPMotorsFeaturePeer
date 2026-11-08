import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CancelSalesInvoiceDialog } from '../../../pages/SalesInvoicesPage/CancelSalesInvoiceDialog'
import { cancelSalesInvoice } from '../../../redux/salesInvoices/salesInvoices.actions'
import type { SalesInvoicesState } from '../../../redux/salesInvoices/salesInvoices.reducer'
import { postedInvoice } from '../../../test/fixtures/salesInvoices'
import { makeSalesInvoiceState, renderWithProviders } from '../../../test/test-utils'

// The dialog renders in a portal, so every query goes through screen
function renderDialog(overrides: Partial<SalesInvoicesState> = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<CancelSalesInvoiceDialog invoice={postedInvoice} onClose={onClose} />, {
    preloadedState: makeSalesInvoiceState(overrides),
  })
  return { ...result, onClose }
}

const reasonField = () => screen.getByRole('textbox', { name: /Reason for cancellation/ })
const confirmButton = () => screen.getByRole('button', { name: 'Confirm Cancel' })

describe('CancelSalesInvoiceDialog', () => {
  it('names the invoice and lists what cancelling does', () => {
    renderDialog()

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('Cancel Invoice INV-2026-0006?')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Accounting reversal transaction will be recorded',
      'Open receivable will be removed',
      'Vehicle status will revert to Available',
      'No bank refund is required because no payment was received',
    ])
  })

  it('requires a reason of at most 500 characters before it can be confirmed', async () => {
    const { user } = renderDialog()

    expect(reasonField()).toHaveAttribute('maxlength', '500')
    expect(confirmButton()).toBeDisabled()
    await user.type(reasonField(), '   ')
    expect(confirmButton()).toBeDisabled()
    await user.type(reasonField(), 'x')
    expect(confirmButton()).toBeEnabled()
  })

  it('dispatches the cancel with the id and reason', async () => {
    const { actions, user } = renderDialog()
    await user.type(reasonField(), 'Customer financing fell through')
    await user.click(confirmButton())
    expect(actions).toEqual([cancelSalesInvoice({ id: '6', reason: 'Customer financing fell through' })])
  })

  it('closes on Keep Invoice without dispatching', async () => {
    const { actions, onClose, user } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Keep Invoice' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(actions).toHaveLength(0)
  })

  it('locks the dialog while cancelling', () => {
    renderDialog({ cancelStatus: 'loading' })
    expect(screen.getByRole('button', { name: 'Cancelling…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Keep Invoice' })).toBeDisabled()
    expect(reasonField()).toBeDisabled()
  })

  it('shows the error from a failed cancel', () => {
    renderDialog({ cancelStatus: 'error', cancelError: 'This sales invoice no longer exists.' })
    expect(screen.getByText('This sales invoice no longer exists.')).toBeInTheDocument()
  })
})
