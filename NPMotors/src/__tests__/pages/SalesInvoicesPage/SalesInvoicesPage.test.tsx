import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SalesInvoicesPage } from '../../../pages/SalesInvoicesPage/SalesInvoicesPage'
import {
  cancelSalesInvoiceSuccess,
  createSalesInvoice,
  loadSalesInvoiceOptions,
  loadSalesInvoiceOptionsSuccess,
  loadSalesInvoices,
  loadSalesInvoicesFailure,
  loadSalesInvoicesSuccess,
  postSalesInvoice,
  resetSalesInvoiceCancel,
  resetSalesInvoiceSave,
  saveSalesInvoiceSuccess,
  selectSalesInvoice,
  setSalesInvoiceFromDate,
  setSalesInvoicePage,
  setSalesInvoiceSearch,
  setSalesInvoiceStatusFilter,
  setSalesInvoiceToDate,
} from '../../../redux/salesInvoices/salesInvoices.actions'
import type { SalesInvoicesState } from '../../../redux/salesInvoices/salesInvoices.reducer'
import {
  cancelledInvoice,
  draftInvoice,
  partialInvoice,
  postedInvoice,
  salesInvoiceFormValues,
  salesInvoiceOptions,
  sparseInvoice,
} from '../../../test/fixtures/salesInvoices'
import { makeSalesInvoiceState, renderWithProviders } from '../../../test/test-utils'
import type { SalesInvoice } from '../../../types/salesInvoices'

// The page dispatches loadSalesInvoices() and loadSalesInvoiceOptions() on mount. Without a saga nothing answers
// them, so each test dispatches the responses itself, just as the saga would.
function renderLoaded(items: SalesInvoice[], overrides: Partial<SalesInvoicesState> = {}, hasNext = false) {
  const result = renderWithProviders(<SalesInvoicesPage />, { preloadedState: makeSalesInvoiceState(overrides) })
  act(() => {
    result.store.dispatch(loadSalesInvoicesSuccess({ items, hasNext }))
    result.store.dispatch(loadSalesInvoiceOptionsSuccess(salesInvoiceOptions))
  })
  return result
}

const noFilters = { pageNumber: 1, pageSize: 5, status: 'all', fromDate: '', toDate: '', searchTerm: '' } as const

const table = () => screen.getByRole('table', { name: 'Sales invoices' })

// The text of each cell in the row whose invoice number is `number`
const cellsOf = (number: string) => {
  const row = within(table()).getByRole('button', { name: number }).closest('tr')
  if (!row) throw new Error(`No row for ${number}`)
  return within(row).getAllByRole('cell').map((cell) => cell.textContent)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('SalesInvoicesPage', () => {
  it('loads the invoices and lookups on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<SalesInvoicesPage />)
    expect(actions).toContainEqual(loadSalesInvoices())
    expect(actions).toContainEqual(loadSalesInvoiceOptions())
    expect(screen.getByText('Loading sales invoices…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Sales invoices' })).not.toBeInTheDocument()
  })

  it('renders the design columns and a row per invoice', () => {
    renderLoaded([postedInvoice, partialInvoice, draftInvoice, cancelledInvoice, sparseInvoice])

    expect(screen.getByRole('heading', { name: 'Sales Invoices' })).toBeInTheDocument()
    expect(screen.getByText('5 invoices on this page')).toBeInTheDocument()
    // header row + 5 invoices
    expect(within(table()).getAllByRole('row')).toHaveLength(6)
    expect(within(table()).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Invoice #', 'Date', 'Customer', 'Vehicle / VIN', 'Salesperson', 'Sale Price', 'Tax', 'Total', 'Paid', 'Balance', 'Status', 'Actions',
    ])
  })

  it('shows a posted unpaid invoice with its salesperson, short VIN, balance and badges', () => {
    renderLoaded([postedInvoice])
    expect(cellsOf('INV-2026-0006')).toEqual([
      'INV-2026-0006', '2026-10-15', 'John Smith', 'Toyota CamryK0RU000024', 'Maria Lopez',
      '$30,250', '$2,420', '$33,120', '$0', '$33,120', 'PostedUnpaid', '',
    ])
    expect(within(table()).getByText('Posted')).toHaveClass('badge-approved')
    expect(within(table()).getByText('Unpaid')).toHaveClass('badge-unpaid')
  })

  it('shows a partly paid invoice and falls back to the employee id for an unknown salesperson', () => {
    renderLoaded([partialInvoice])
    expect(cellsOf('INV-2026-0003')).toEqual([
      'INV-2026-0003', '2026-09-20', 'John Smith', 'Chevrolet Silverado 1500D5NZ123456', 'Employee #1',
      '$44,500', '$3,560', '$48,010', '$10,000', '$38,010', 'PostedPartial', '',
    ])
  })

  it('shows "—" for the paid and balance of a draft and greys out its row', () => {
    renderLoaded([draftInvoice])
    expect(cellsOf('INV-2026-0008')).toEqual([
      'INV-2026-0008', '2026-11-01', 'John Smith', 'Toyota CamryK0RU000024', 'Maria Lopez',
      '$30,250', '$2,420', '$33,120', '—', '—', 'Draft', '',
    ])
    expect(within(table()).getByRole('button', { name: 'INV-2026-0008' }).closest('tr')).toHaveClass('is-draft')
  })

  it('falls back for missing fields and hides a zero balance', () => {
    renderLoaded([sparseInvoice])
    expect(cellsOf('INV-SPARSE')).toEqual([
      'INV-SPARSE', '—', '—', '——', '—', '$0', '$0', '$0', '$0', '—', 'PostedPaid', '',
    ])
  })

  it('shows the salesperson id until the employees load', () => {
    const { store } = renderWithProviders(<SalesInvoicesPage />)
    act(() => { store.dispatch(loadSalesInvoicesSuccess({ items: [postedInvoice], hasNext: false })) })
    expect(within(table()).getByText('Employee #12')).toBeInTheDocument()
  })

  it('offers Cancel only on posted invoices with nothing paid', () => {
    renderLoaded([postedInvoice, partialInvoice, draftInvoice, cancelledInvoice])
    expect(within(table()).getAllByRole('button', { name: /^Cancel invoice/ }))
      .toEqual([within(table()).getByRole('button', { name: 'Cancel invoice INV-2026-0006' })])
    expect(within(table()).getAllByRole('button', { name: /^View invoice/ })).toHaveLength(4)
  })

  it('uses the singular for a single invoice', () => {
    renderLoaded([postedInvoice])
    expect(screen.getByText('1 invoice on this page')).toBeInTheDocument()
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No sales invoices found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try clearing/)).not.toBeInTheDocument()
  })

  it.each([
    ['status', { status: 'draft' }],
    ['from date', { fromDate: '2026-10-01' }],
    ['to date', { toDate: '2026-10-31' }],
    ['search', { searchTerm: 'INV' }],
  ] as const)('adds the clear-filters hint when the %s filter is active', (_, filter) => {
    renderLoaded([], { query: { ...noFilters, ...filter } })
    expect(screen.getByText('No sales invoices found. Try clearing the search, dates or status filter.')).toBeInTheDocument()
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], { query: { ...noFilters, pageNumber: 2 } })
    expect(screen.getByText('No more sales invoices on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<SalesInvoicesPage />)
    act(() => { store.dispatch(loadSalesInvoicesFailure('Sales invoice service is unreachable.')) })

    expect(screen.getByText("Couldn't load sales invoices")).toBeInTheDocument()
    expect(screen.getByText('Sales invoice service is unreachable.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Sales invoices' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadSalesInvoices().type)).toHaveLength(2)
  })

  it('dispatches the search term after the debounce delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { actions } = renderLoaded([postedInvoice])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.type(screen.getByRole('searchbox', { name: 'Search invoices' }), '  INV-2026 ')
    expect(actions).not.toContainEqual(setSalesInvoiceSearch('INV-2026'))

    act(() => { vi.advanceTimersByTime(300) })
    expect(actions).toContainEqual(setSalesInvoiceSearch('INV-2026'))
  })

  it('offers every status and dispatches the chosen one', async () => {
    const { actions, user } = renderLoaded([postedInvoice])
    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent))
      .toEqual(['All Status', 'Draft', 'Posted', 'Paid', 'Partial', 'Unpaid', 'Cancelled'])
    await user.click(screen.getByRole('option', { name: 'Unpaid' }))
    expect(actions).toContainEqual(setSalesInvoiceStatusFilter('unpaid'))
  })

  it('shows the active status in its dropdown', () => {
    renderLoaded([], { query: { ...noFilters, status: 'partial' } })
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveTextContent('Partial')
  })

  it('dispatches the date range and limits each bound by the other', () => {
    const { actions } = renderLoaded([], { query: { ...noFilters, fromDate: '2026-10-01', toDate: '2026-10-31' } })
    const from = screen.getByLabelText('From date')
    const to = screen.getByLabelText('To date')
    expect(from).toHaveValue('2026-10-01')
    expect(from).toHaveAttribute('max', '2026-10-31')
    expect(to).toHaveAttribute('min', '2026-10-01')

    fireEvent.change(from, { target: { value: '2026-09-01' } })
    fireEvent.change(to, { target: { value: '' } })
    expect(actions).toContainEqual(setSalesInvoiceFromDate('2026-09-01'))
    expect(actions).toContainEqual(setSalesInvoiceToDate(''))
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([postedInvoice], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setSalesInvoicePage(2))
  })

  it('disables the number and View links when an invoice has no id', () => {
    renderLoaded([sparseInvoice])
    expect(within(table()).getByRole('button', { name: 'INV-SPARSE' })).toBeDisabled()
    expect(within(table()).getByRole('button', { name: 'View invoice INV-SPARSE' })).toBeDisabled()
  })

  it.each([
    ['its number', 'INV-2026-0006'],
    ['its View button', 'View invoice INV-2026-0006'],
  ])('opens an invoice from %s', async (_, name) => {
    const { actions, user } = renderLoaded([postedInvoice])
    await user.click(screen.getByRole('button', { name }))
    expect(actions).toContainEqual(selectSalesInvoice('6'))
    expect(screen.getByText('Loading sales invoice…')).toBeInTheDocument()
  })

  it('renders the detail view instead of the list when an invoice is selected', () => {
    renderWithProviders(<SalesInvoicesPage />, { preloadedState: makeSalesInvoiceState({ selectedId: '6', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading sales invoice…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sales Invoices' })).not.toBeInTheDocument()
  })

  describe('New Invoice', () => {
    it('resets the save state and swaps the list for the form', async () => {
      const { actions, user } = renderLoaded([postedInvoice])
      await user.click(screen.getByRole('button', { name: 'New Invoice' }))

      expect(actions).toContainEqual(resetSalesInvoiceSave())
      expect(screen.getByText('New Sales Invoice')).toBeInTheDocument()
      expect(screen.queryByRole('table', { name: 'Sales invoices' })).not.toBeInTheDocument()
    })

    it('returns to the list from the form without a banner', async () => {
      const { user } = renderLoaded([postedInvoice])
      await user.click(screen.getByRole('button', { name: 'New Invoice' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(table()).toBeInTheDocument()
      expect(screen.queryByText(/successfully/)).not.toBeInTheDocument()
    })

    it.each([
      ['a draft', createSalesInvoice(salesInvoiceFormValues), 'Draft saved successfully.'],
      ['a posted invoice', postSalesInvoice(salesInvoiceFormValues), 'Invoice posted successfully.'],
    ])('shows the banner after saving %s, then hides it after 4 seconds', async (_, save, message) => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { store } = renderLoaded([postedInvoice])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByRole('button', { name: 'New Invoice' }))

      act(() => {
        store.dispatch(save)
        store.dispatch(saveSalesInvoiceSuccess())
      })
      expect(screen.getByText(message)).toBeInTheDocument()
      expect(table()).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByText(message)).not.toBeInTheDocument()
      expect(store.getState().salesInvoices.saveStatus).toBe('idle')
    })

    it('dismisses the save banner', async () => {
      const { store, user } = renderLoaded([postedInvoice])
      await user.click(screen.getByRole('button', { name: 'New Invoice' }))
      act(() => {
        store.dispatch(createSalesInvoice(salesInvoiceFormValues))
        store.dispatch(saveSalesInvoiceSuccess())
      })

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText('Draft saved successfully.')).not.toBeInTheDocument()
      expect(store.getState().salesInvoices.saveStatus).toBe('idle')
    })
  })

  describe('Cancel invoice', () => {
    it('resets the cancel state and opens the dialog for the row', async () => {
      const { actions, user } = renderLoaded([postedInvoice])
      await user.click(screen.getByRole('button', { name: 'Cancel invoice INV-2026-0006' }))

      expect(actions).toContainEqual(resetSalesInvoiceCancel())
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Cancel Invoice INV-2026-0006?')).toBeInTheDocument()
    })

    it('closes the dialog on Keep Invoice without a banner', async () => {
      const { user } = renderLoaded([postedInvoice])
      await user.click(screen.getByRole('button', { name: 'Cancel invoice INV-2026-0006' }))
      await user.click(screen.getByRole('button', { name: 'Keep Invoice' }))

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(screen.queryByText(/cancelled\. The vehicle/)).not.toBeInTheDocument()
    })

    it('swaps the dialog for a banner once cancelled, then hides it after 4 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { store } = renderLoaded([postedInvoice])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByRole('button', { name: 'Cancel invoice INV-2026-0006' }))

      act(() => { store.dispatch(cancelSalesInvoiceSuccess()) })
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(screen.getByText('Invoice INV-2026-0006 cancelled. The vehicle is available again.')).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByText(/cancelled\. The vehicle/)).not.toBeInTheDocument()
      expect(store.getState().salesInvoices.cancelStatus).toBe('idle')
    })
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV with the salesperson names and statuses', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:sales-invoices' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([postedInvoice, sparseInvoice])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:sales-invoices')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv?.split('\n')).toEqual([
        '"Invoice #","Date","Due Date","Customer","Vehicle","VIN","Salesperson","Sale Price","Tax","Fees","Discount","Total","Paid","Balance","Status"',
        '"INV-2026-0006","2026-10-15","2026-11-14","John Smith","Toyota Camry","4T1G11AK0RU000024","Maria Lopez","30250","2420","450","0","33120","0","33120","Posted · Unpaid"',
        '"INV-SPARSE","","","","","","","0","0","0","0","0","0","0","Posted · Paid"',
      ])
      click.mockRestore()
    })
  })
})
