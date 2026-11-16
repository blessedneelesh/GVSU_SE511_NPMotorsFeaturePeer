import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SalesInvoiceDetail } from '../../../pages/SalesInvoicesPage/SalesInvoiceDetail'
import { selectCustomer } from '../../../redux/customers/customers.actions'
import {
  clearPaymentHistory,
  loadPaymentHistory,
  loadPaymentHistoryFailure,
  loadPaymentHistorySuccess,
  loadReceiptBankAccountOptionsSuccess,
  recordArPayment,
  resetReceiptSave,
} from '../../../redux/receipts/receipts.actions'
import { selectVehicle } from '../../../redux/vehicles/vehicles.actions'
import { receiptPayments } from '../../../test/fixtures/receipts'
import {
  cancelSalesInvoiceSuccess,
  clearSalesInvoiceSelection,
  loadSalesInvoiceOptions,
  loadSalesInvoiceOptionsSuccess,
  resetSalesInvoiceCancel,
  selectSalesInvoice,
} from '../../../redux/salesInvoices/salesInvoices.actions'
import {
  cancelledInvoice,
  draftInvoice,
  partialInvoice,
  postedInvoice,
  salesInvoiceOptions,
  sparseInvoice,
} from '../../../test/fixtures/salesInvoices'
import { makeSalesInvoiceState, renderWithProviders } from '../../../test/test-utils'
import { availableVehicle } from '../../../test/fixtures/vehicles'
import type { SalesInvoice } from '../../../types/salesInvoices'
import type { Vehicle } from '../../../types/vehicles'

interface ProfileOptions {
  options?: boolean
  // The invoice's vehicle record, as the detail saga loads it after the invoice
  vehicle?: Vehicle | null
}

// The detail view loads the customers and employees on mount for Bill To and Salesperson; the helper answers it
const renderProfile = (selected: SalesInvoice, { options = true, vehicle = null }: ProfileOptions = {}, ui = <SalesInvoiceDetail />) => {
  const result = renderWithProviders(ui, {
    preloadedState: makeSalesInvoiceState({ selectedId: selected.id || 'X', selected, selectedVehicle: vehicle, detailStatus: 'success' }),
  })
  if (options) act(() => { result.store.dispatch(loadSalesInvoiceOptionsSuccess(salesInvoiceOptions)) })
  return result
}

// The command bar and Related Records leave for other screens; stand-ins show which one was reached
const renderRouted = (selected: SalesInvoice, profileOptions: ProfileOptions = {}) =>
  renderProfile(selected, profileOptions, (
    <Routes>
      <Route path="/" element={<SalesInvoiceDetail />} />
      <Route path="/accounts-receivable" element={<p>Accounts Receivable screen</p>} />
      <Route path="/customers" element={<p>Customers screen</p>} />
      <Route path="/vehicle-inventory" element={<p>Vehicles screen</p>} />
      <Route path="/transactions" element={<p>Transactions screen</p>} />
    </Routes>
  ))

// Every summary figure is a <dt>/<dd> pair; returns the <dd> for a label inside a container
const valueOf = (container: HTMLElement, label: string) => {
  const value = within(container).getByText(label, { selector: 'dt' }).nextElementSibling
  if (!(value instanceof HTMLElement)) throw new Error(`No value for ${label}`)
  return value
}

const sectionOf = (heading: string) => {
  const section = screen.getByRole('heading', { name: heading }).closest('section')
  if (!section) throw new Error(`No section for ${heading}`)
  return section
}

// The Bill To, Vehicle and Invoice Details blocks are a heading followed by its content
const blockOf = (heading: string) => {
  const block = screen.getByRole('heading', { name: heading }).parentElement
  if (!block) throw new Error(`No block for ${heading}`)
  return block
}

// Each line-item row as the text of its cells, header row left out
const lineItems = (number: string) =>
  within(screen.getByRole('table', { name: `Line items for ${number}` })).getAllByRole('row').slice(1)
    .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))

const breadcrumb = () => screen.getByRole('navigation', { name: 'Breadcrumb' })

describe('SalesInvoiceDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<SalesInvoiceDetail />, { preloadedState: makeSalesInvoiceState({ selectedId: '6', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading sales invoice…')).toBeInTheDocument()
    expect(within(breadcrumb()).getByText('Sales Invoice')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel Invoice' })).not.toBeInTheDocument()
  })

  it('shows the error and retries the same invoice', async () => {
    const { actions, user } = renderWithProviders(<SalesInvoiceDetail />, {
      preloadedState: makeSalesInvoiceState({ selectedId: '6', detailStatus: 'error', detailError: 'This sales invoice no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load sales invoice")).toBeInTheDocument()
    expect(screen.getByText('This sales invoice no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([loadSalesInvoiceOptions(), selectSalesInvoice('6')])
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderProfile(postedInvoice)
    await user.click(screen.getByRole('button', { name: '← Sales Invoices' }))
    expect(actions).toContainEqual(clearSalesInvoiceSelection())
  })

  describe('posted, unpaid', () => {
    it('shows the number, the due-date banner and an empty payment progress bar', () => {
      renderProfile(postedInvoice)

      expect(within(breadcrumb()).getByText('INV-2026-0006')).toBeInTheDocument()
      expect(screen.getByText('Posted · Unpaid')).toBeInTheDocument()
      expect(screen.getByText('Due 2026-11-14 · $33,120.00 outstanding')).toBeInTheDocument()
      expect(screen.getByRole('progressbar', { name: 'Payment progress' })).toHaveAttribute('aria-valuenow', '0')
      expect(screen.getByText('0% collected')).toBeInTheDocument()
    })

    it('bills the customer with their address and contact details', () => {
      renderProfile(postedInvoice)

      const billTo = blockOf('Bill To')
      expect(within(billTo).getByText('John Smith')).toBeInTheDocument()
      expect(within(billTo).getByText('1250 Motor Mile Drive')).toBeInTheDocument()
      expect(within(billTo).getByText('Dallas, TX 75201')).toBeInTheDocument()
      expect(within(billTo).getByText('(214) 555-0101')).toBeInTheDocument()
      expect(within(billTo).getByText('john.smith@email.com')).toBeInTheDocument()
    })

    it('shows the vehicle and the invoice details with the salesperson name', () => {
      renderProfile(postedInvoice)

      expect(within(blockOf('Vehicle')).getByText('Toyota Camry')).toBeInTheDocument()
      expect(within(blockOf('Vehicle')).getByText('4T1G11AK0RU000024')).toBeInTheDocument()
      const details = blockOf('Invoice Details')
      expect(valueOf(details, 'Invoice Date')).toHaveTextContent('2026-10-15')
      // An outstanding balance on a posted invoice highlights the due date
      expect(valueOf(details, 'Due Date')).toHaveTextContent('2026-11-14')
      expect(valueOf(details, 'Due Date')).toHaveClass('text-amber')
      expect(valueOf(details, 'Salesperson')).toHaveTextContent('Maria Lopez')
      expect(within(valueOf(details, 'Status')).getByText('Posted')).toHaveClass('badge-approved')
      expect(within(valueOf(details, 'Status')).getByText('Unpaid')).toHaveClass('badge-unpaid')
    })

    it('lists the vehicle, fees, subtotal, tax and total as line items', () => {
      renderProfile(postedInvoice)
      expect(lineItems('INV-2026-0006')).toEqual([
        ['Toyota CamryVIN: 4T1G11AK0RU000024', '1', '$30,250.00', '$30,250.00'],
        ['Document & Processing Fees', '—', '—', '$450.00'],
        ['Subtotal', '$30,700.00'],
        ['Sales Tax (8%)', '$2,420.00'],
        ['TOTAL DUE', '$33,120.00'],
      ])
    })

    it('summarises the amounts and the gross profit', () => {
      renderProfile(postedInvoice)

      const summary = sectionOf('Amount Summary')
      expect(valueOf(summary, 'Sale Price')).toHaveTextContent('$30,250.00')
      expect(within(summary).queryByText('Discount')).not.toBeInTheDocument()
      expect(valueOf(summary, 'Fees')).toHaveTextContent('$450.00')
      expect(valueOf(summary, 'Tax')).toHaveTextContent('$2,420.00')
      expect(valueOf(summary, 'Total')).toHaveTextContent('$33,120.00')
      expect(valueOf(summary, 'Paid')).toHaveTextContent('$0.00')
      expect(valueOf(summary, 'Balance Due')).toHaveTextContent('$33,120.00')

      const profit = sectionOf('Gross Profitability')
      expect(valueOf(profit, 'Vehicle Cost')).toHaveTextContent('-$26,800.00')
      expect(valueOf(profit, 'Gross Profit')).toHaveTextContent('$3,450.00')
      expect(valueOf(profit, 'Gross Profit')).toHaveClass('text-green')
      // 3,450 / 30,250
      expect(valueOf(profit, 'Margin')).toHaveTextContent('11.4%')
    })

    it('shows the invoice name for Bill To until the customers load', () => {
      renderProfile(postedInvoice, { options: false })
      expect(within(blockOf('Bill To')).getByText('John Smith')).toBeInTheDocument()
      expect(within(blockOf('Bill To')).queryByText('1250 Motor Mile Drive')).not.toBeInTheDocument()
      expect(valueOf(blockOf('Invoice Details'), 'Salesperson')).toHaveTextContent('Employee #12')
    })
  })

  describe('posted, partly paid', () => {
    it('shows how much is received and outstanding, and the progress', () => {
      renderProfile(partialInvoice)

      expect(screen.getByText('Posted · Partial')).toBeInTheDocument()
      expect(screen.getByText('$10,000.00 received · $38,010.00 outstanding')).toBeInTheDocument()
      // 10,000 / 48,010
      expect(screen.getByRole('progressbar', { name: 'Payment progress' })).toHaveAttribute('aria-valuenow', '21')
      expect(screen.getByText('21% collected')).toBeInTheDocument()
    })

    it('adds the discount and the payment to the line items and summary', () => {
      renderProfile(partialInvoice)

      expect(lineItems('INV-2026-0003')).toEqual([
        ['Chevrolet Silverado 1500VIN: 1GCUYDED5NZ123456', '1', '$44,500.00', '$44,500.00'],
        ['Negotiated Discount', '—', '—', '-$500.00'],
        ['Document & Processing Fees', '—', '—', '$450.00'],
        ['Subtotal', '$44,450.00'],
        ['Sales Tax (8%)', '$3,560.00'],
        ['TOTAL DUE', '$48,010.00'],
        ['Amount Paid', '-$10,000.00'],
        ['BALANCE DUE', '$38,010.00'],
      ])
      const summary = sectionOf('Amount Summary')
      expect(valueOf(summary, 'Discount')).toHaveTextContent('-$500.00')
      expect(valueOf(summary, 'Paid')).toHaveTextContent('$10,000.00')
      expect(valueOf(summary, 'Balance Due')).toHaveTextContent('$38,010.00')
    })

    it('falls back to the employee id for a salesperson who is not in the list', () => {
      renderProfile(partialInvoice)
      expect(valueOf(blockOf('Invoice Details'), 'Salesperson')).toHaveTextContent('Employee #1')
    })

    it('cannot be cancelled once a payment is received', () => {
      renderProfile(partialInvoice)
      expect(screen.queryByRole('button', { name: 'Cancel Invoice' })).not.toBeInTheDocument()
    })
  })

  it('shows a draft without payment progress, paid amount or cancel button', () => {
    renderProfile(draftInvoice)

    expect(screen.getByText('Not posted yet, so no accounting entries have been created')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(valueOf(blockOf('Invoice Details'), 'Status')).getByText('Draft')).toHaveClass('badge-draft')
    expect(valueOf(blockOf('Invoice Details'), 'Due Date')).not.toHaveClass('text-amber')
    expect(within(sectionOf('Amount Summary')).queryByText('Paid')).not.toBeInTheDocument()
    expect(within(sectionOf('Amount Summary')).queryByText('Balance Due')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel Invoice' })).not.toBeInTheDocument()
  })

  it('shows the reason on a cancelled invoice', () => {
    renderProfile(cancelledInvoice)

    expect(screen.getByText('Customer financing fell through')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(within(valueOf(blockOf('Invoice Details'), 'Status')).getByText('Cancelled')).toHaveClass('badge-cancelled')
    expect(screen.queryByRole('button', { name: 'Cancel Invoice' })).not.toBeInTheDocument()
  })

  it('falls back for a cancelled invoice with no reason', () => {
    renderProfile({ ...cancelledInvoice, cancelReason: '' })
    expect(screen.getByText('This invoice has been cancelled')).toBeInTheDocument()
  })

  it('falls back for missing fields', () => {
    renderProfile(sparseInvoice)

    expect(screen.getByText('Fully paid')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    // Bill To (not the fixture customer with an empty id), vehicle, VIN, invoice date, due date and salesperson
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
    const parties = blockOf('Bill To').parentElement
    if (!parties) throw new Error('No parties block')
    expect(within(parties).getAllByText('—')).toHaveLength(6)
    expect(lineItems('INV-SPARSE')[0]).toEqual(['VehicleVIN: —', '1', '$0.00', '$0.00'])
    expect(valueOf(sectionOf('Gross Profitability'), 'Margin')).toHaveTextContent('0.0%')
  })

  describe('Cancel Invoice', () => {
    it('resets the cancel state and opens the dialog', async () => {
      const { actions, user } = renderProfile(postedInvoice)
      await user.click(screen.getByRole('button', { name: 'Cancel Invoice' }))

      expect(actions).toContainEqual(resetSalesInvoiceCancel())
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Cancel Invoice INV-2026-0006?')).toBeInTheDocument()
    })

    it('closes the dialog on Keep Invoice', async () => {
      const { user } = renderProfile(postedInvoice)
      await user.click(screen.getByRole('button', { name: 'Cancel Invoice' }))
      await user.click(screen.getByRole('button', { name: 'Keep Invoice' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    })

    it('swaps the dialog for a banner once cancelled and dismisses it', async () => {
      const { store, user } = renderProfile(postedInvoice)
      await user.click(screen.getByRole('button', { name: 'Cancel Invoice' }))

      act(() => { store.dispatch(cancelSalesInvoiceSuccess()) })
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(screen.getByText('Invoice cancelled. The vehicle is available again.')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText('Invoice cancelled. The vehicle is available again.')).not.toBeInTheDocument()
      expect(store.getState().salesInvoices.cancelStatus).toBe('idle')
    })
  })

  describe('command bar', () => {
    it('offers Receive Payment, Print and Send to Customer on an unpaid invoice', () => {
      renderProfile(postedInvoice)
      const toolbar = screen.getByRole('toolbar', { name: 'Invoice actions' })
      expect(within(toolbar).getByRole('button', { name: 'Receive Payment' })).toBeInTheDocument()
      expect(within(toolbar).getByRole('button', { name: 'Print' })).toBeInTheDocument()
      expect(within(toolbar).getByRole('button', { name: 'Cancel Invoice' })).toBeInTheDocument()

      const send = within(toolbar).getByRole('link', { name: 'Send to Customer' })
      const href = send.getAttribute('href') ?? ''
      expect(href).toMatch(/^mailto:john\.smith%40email\.com\?subject=Sales%20Invoice%20INV-2026-0006&body=/)
      expect(decodeURIComponent(href)).toContain('Balance due: $33,120.00 by 2026-11-14')
    })

    describe('Receive Payment', () => {
      const openPayment = async () => {
        const result = renderProfile(postedInvoice)
        await result.user.click(within(screen.getByRole('toolbar', { name: 'Invoice actions' })).getByRole('button', { name: 'Receive Payment' }))
        return result
      }

      it('opens the payment form for the invoice\'s balance straight away', async () => {
        const { actions } = await openPayment()
        expect(actions).toContainEqual(resetReceiptSave())
        const dialog = screen.getByRole('dialog', { name: 'Receive Payment' })
        expect(within(dialog).getByText('INV-2026-0006 · John Smith')).toBeInTheDocument()
        expect(within(dialog).getByText('Balance Due').nextElementSibling).toHaveTextContent('$33,120.00')
        expect(within(dialog).getByRole('spinbutton', { name: /Payment Amount/ })).toHaveValue(33120)
      })

      it('posts the payment against the invoice\'s AR invoice', async () => {
        const { actions, store, user } = await openPayment()
        act(() => { store.dispatch(loadReceiptBankAccountOptionsSuccess([{ id: '1', name: 'Operating Checking', bankName: 'Chase', accountNumber: '****4521' }])) })
        const amount = screen.getByRole('spinbutton', { name: /Payment Amount/ })
        await user.clear(amount)
        await user.type(amount, '5000')
        await user.click(screen.getByRole('button', { name: 'Post Payment' }))

        expect(actions).toContainEqual(recordArPayment({
          arInvoiceId: '4006',
          values: expect.objectContaining({ amount: '5000', bankAccountId: '1', paymentMethod: 'transfer' }),
        }))
      })

      it('is not offered on an invoice with no AR invoice to post to', () => {
        renderProfile({ ...postedInvoice, arInvoiceId: '' })
        expect(screen.queryByRole('button', { name: 'Receive Payment' })).not.toBeInTheDocument()
      })

      it('keeps the dialog open while the invoice reloads after the payment', async () => {
        const { store } = await openPayment()
        // What the saga does after the payment: reload the sales invoice
        act(() => { store.dispatch(selectSalesInvoice('6')) })
        expect(screen.getByText('Loading sales invoice…')).toBeInTheDocument()
        expect(screen.getByRole('dialog', { name: 'Receive Payment' })).toBeInTheDocument()
      })
    })

    it('prints the invoice', async () => {
      const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
      const { user } = renderProfile(postedInvoice)
      await user.click(screen.getByRole('button', { name: 'Print' }))
      expect(print).toHaveBeenCalledTimes(1)
      print.mockRestore()
    })

    it('cannot send to a customer without an email address', () => {
      renderProfile(postedInvoice, { options: false })
      expect(screen.getByRole('button', { name: 'Send to Customer' })).toBeDisabled()
    })

    it.each([
      ['a draft', draftInvoice],
      ['a cancelled invoice', cancelledInvoice],
      ['a fully paid invoice', sparseInvoice],
    ])('offers no Receive Payment on %s', (_, invoice) => {
      renderProfile(invoice)
      expect(screen.queryByRole('button', { name: 'Receive Payment' })).not.toBeInTheDocument()
    })
  })

  describe('vehicle record', () => {
    it('adds the year and color once the vehicle loads', () => {
      renderProfile(postedInvoice, { vehicle: availableVehicle })
      expect(within(blockOf('Vehicle')).getByText('2024 Toyota Camry')).toBeInTheDocument()
      expect(within(blockOf('Vehicle')).getByText('Color: Silver')).toBeInTheDocument()
    })

    it('lists the vehicle and customer on the Vehicle Details tab', () => {
      renderProfile(postedInvoice, { vehicle: availableVehicle })
      expect(screen.getByRole('tab', { name: 'Vehicle Details' })).toHaveAttribute('aria-selected', 'true')

      const vehicleInfo = blockOf('Vehicle Information')
      expect(valueOf(vehicleInfo, 'Year')).toHaveTextContent('2024')
      expect(valueOf(vehicleInfo, 'Color')).toHaveTextContent('Silver')
      expect(valueOf(vehicleInfo, 'Warehouse')).toHaveTextContent('Showroom')
      expect(valueOf(vehicleInfo, 'VIN')).toHaveTextContent('4T1G11AK0RU000024')

      const customerInfo = blockOf('Customer')
      expect(valueOf(customerInfo, 'Phone')).toHaveTextContent('(214) 555-0101')
      expect(valueOf(customerInfo, 'Address')).toHaveTextContent('1250 Motor Mile Drive, Dallas')
      expect(valueOf(customerInfo, 'Customer ID')).toHaveTextContent('C001')
    })

    it('falls back to the invoice\'s make, model and VIN without the vehicle record', () => {
      renderProfile(postedInvoice)
      const vehicleInfo = blockOf('Vehicle Information')
      expect(valueOf(vehicleInfo, 'Make')).toHaveTextContent('Toyota')
      expect(valueOf(vehicleInfo, 'Year')).toHaveTextContent('—')
      expect(valueOf(vehicleInfo, 'Warehouse')).toHaveTextContent('—')
    })
  })

  describe('Payment History tab', () => {
    it('says no payments are received yet and offers to take one', async () => {
      const { user } = renderRouted(postedInvoice)
      await user.click(screen.getByRole('tab', { name: 'Payment History' }))

      const panel = screen.getByRole('tabpanel', { name: 'Payment History' })
      expect(within(panel).getByText('No payments received yet')).toBeInTheDocument()
      await user.click(within(panel).getByRole('button', { name: 'Receive Payment' }))
      expect(screen.getByRole('dialog', { name: 'Receive Payment' })).toBeInTheDocument()
    })

    it('does not load payments for an invoice with nothing paid', async () => {
      const { actions, user } = renderProfile(postedInvoice)
      await user.click(screen.getByRole('tab', { name: 'Payment History' }))
      expect(actions.some((action) => action.type === loadPaymentHistory('4006').type)).toBe(false)
    })

    it('lists the receipts of the invoice\'s AR invoice, newest first', async () => {
      const { actions, store, user } = renderProfile(partialInvoice)
      await user.click(screen.getByRole('tab', { name: 'Payment History' }))
      expect(actions).toContainEqual(loadPaymentHistory('4003'))
      expect(screen.getByText('Loading payments…')).toBeInTheDocument()

      // With no saga running, the test answers as the saga would
      act(() => { store.dispatch(loadPaymentHistorySuccess({ arInvoiceId: '4003', payments: receiptPayments })) })
      const rows = within(screen.getByRole('table', { name: 'Payments for INV-2026-0003' })).getAllByRole('row').slice(1)
      expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
        ['2026-11-10', 'Bank Transfer', 'RCT-2026-000462', '$650.00', 'Deposited to Business Savings'],
        ['2026-11-08', 'Check', 'RCT-2026-000461', '$1,200.00', 'Deposited to Operating Checking · INV-004262'],
      ])
    })

    it('shows when the payments failed to load and retries', async () => {
      const { actions, store, user } = renderProfile(partialInvoice)
      await user.click(screen.getByRole('tab', { name: 'Payment History' }))
      act(() => { store.dispatch(loadPaymentHistoryFailure('Payment history could not be loaded. Please try again.')) })

      expect(screen.getByText("Couldn't load payments")).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Retry' }))
      expect(actions.filter((action) => action.type === loadPaymentHistory('4003').type)).toHaveLength(2)
    })

    it('forgets the payments when the tab is left', async () => {
      const { actions, user } = renderProfile(partialInvoice)
      await user.click(screen.getByRole('tab', { name: 'Payment History' }))
      await user.click(screen.getByRole('tab', { name: 'Vehicle Details' }))
      expect(actions).toContainEqual(clearPaymentHistory())
    })

    it('shows the amount paid as one row, without loading, when the invoice has no AR invoice', async () => {
      const { actions, user } = renderProfile({ ...partialInvoice, arInvoiceId: '' })
      await user.click(screen.getByRole('tab', { name: 'Payment History' }))
      expect(actions.some((action) => action.type === loadPaymentHistory('').type)).toBe(false)
      expect(screen.getByText('Recorded payment')).toBeInTheDocument()
    })

    it('falls back to the amount paid when no receipts are found', async () => {
      const { store, user } = renderProfile(partialInvoice)
      await user.click(screen.getByRole('tab', { name: 'Payment History' }))
      act(() => { store.dispatch(loadPaymentHistorySuccess({ arInvoiceId: '4003', payments: [] })) })

      const rows = within(screen.getByRole('table', { name: 'Payments for INV-2026-0003' })).getAllByRole('row').slice(1)
      expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
        ['2026-09-20', 'Recorded payment', '—', '$10,000.00', 'Payment recorded with invoice'],
      ])
      const panel = screen.getByRole('tabpanel', { name: 'Payment History' })
      expect(valueOf(panel, 'Total Paid')).toHaveTextContent('$10,000.00')
      expect(valueOf(panel, 'Balance Remaining')).toHaveTextContent('$38,010.00')
    })
  })

  describe('Related Records', () => {
    it('opens the customer\'s profile on the Customers page', async () => {
      const { actions, user } = renderRouted(postedInvoice)
      await user.click(screen.getByRole('button', { name: /Customer Profile/ }))
      expect(actions).toContainEqual(selectCustomer('C001'))
      expect(screen.getByText('Customers screen')).toBeInTheDocument()
    })

    it('opens the vehicle record on the Vehicles page', async () => {
      const { actions, user } = renderRouted(postedInvoice, { vehicle: availableVehicle })
      expect(screen.getByRole('button', { name: /Vehicle Record/ })).toHaveTextContent('2024 Toyota Camry')
      await user.click(screen.getByRole('button', { name: /Vehicle Record/ }))
      expect(actions).toContainEqual(selectVehicle('24'))
      expect(screen.getByText('Vehicles screen')).toBeInTheDocument()
    })

    it('links the GL entries and profitability report', async () => {
      const { user } = renderRouted(postedInvoice)
      expect(screen.getByRole('button', { name: /Vehicle Profitability/ })).toHaveTextContent('Margin 11.4%')
      await user.click(screen.getByRole('button', { name: /GL Entries/ }))
      expect(screen.getByText('Transactions screen')).toBeInTheDocument()
    })

    it('has no GL entries for a draft, and nothing to open without ids', () => {
      renderProfile(draftInvoice)
      expect(screen.queryByRole('button', { name: /GL Entries/ })).not.toBeInTheDocument()
      cleanup()
      renderProfile(sparseInvoice)
      expect(screen.getByRole('button', { name: /Customer Profile/ })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Vehicle Record/ })).toBeDisabled()
    })
  })
})
