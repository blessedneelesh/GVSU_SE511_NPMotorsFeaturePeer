import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Dropdown,
  Input,
  Link,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Option,
  SearchBox,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
} from '@fluentui/react-components'
import { Add20Regular, DismissCircle20Regular, Eye20Regular } from '@fluentui/react-icons'
import { useSalesInvoiceDetail } from '../../hooks/useSalesInvoiceDetail'
import { useSalesInvoiceMutations } from '../../hooks/useSalesInvoiceMutations'
import { useSalesInvoiceOptions } from '../../hooks/useSalesInvoiceOptions'
import { useSalesInvoices } from '../../hooks/useSalesInvoices'
import type { SalesInvoice, SalesInvoiceStatusFilter } from '../../types/salesInvoices'
import { CancelSalesInvoiceDialog } from './CancelSalesInvoiceDialog'
import { SalesInvoiceDetail } from './SalesInvoiceDetail'
import { SalesInvoiceForm } from './SalesInvoiceForm'
import { canCancel, formatCurrency, shortVin, statusBadges, statusTitle } from './salesInvoiceMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './SalesInvoicesPage.css'

const pageSizeOptions = [5, 10, 25, 50]

const BANNER_MS = 4000

const statusOptions: { value: SalesInvoiceStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'cancelled', label: 'Cancelled' },
]

const isStatusFilter = (value: unknown): value is SalesInvoiceStatusFilter =>
  statusOptions.some((option) => option.value === value)

function exportSalesInvoices(rows: SalesInvoice[], salespersonName: (id: string) => string) {
  const header = ['Invoice #', 'Date', 'Due Date', 'Customer', 'Vehicle', 'VIN', 'Salesperson', 'Sale Price', 'Tax', 'Fees', 'Discount', 'Total', 'Paid', 'Balance', 'Status']
  const lines = [
    header,
    ...rows.map((i) => [
      i.number, i.invoiceDate, i.dueDate, i.customerName, i.vehicle, i.vin, salespersonName(i.salespersonId),
      String(i.salePrice), String(i.tax), String(i.fees), String(i.discount), String(i.total), String(i.paid), String(i.balance), statusTitle(i),
    ]),
  ]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'sales-invoices.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function SalesInvoicesPage() {
  const {
    salesInvoices,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setStatusFilter,
    setFromDate,
    setToDate,
    setPage,
    setPageSize,
    retry,
  } = useSalesInvoices()
  const { selectedId, openSalesInvoice } = useSalesInvoiceDetail()
  const { saveMode, saveStatus, cancelStatus, resetSave, resetCancel } = useSalesInvoiceMutations()
  const { salespersonName } = useSalesInvoiceOptions()
  const [isFormOpen, setFormOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<SalesInvoice | null>(null)

  const openForm = () => {
    resetSave()
    setFormOpen(true)
  }
  const closeForm = useCallback(() => {
    resetSave()
    setFormOpen(false)
  }, [resetSave])

  const openCancel = (invoice: SalesInvoice) => {
    resetCancel()
    setCancelTarget(invoice)
  }
  const closeCancel = useCallback(() => {
    resetCancel()
    setCancelTarget(null)
  }, [resetCancel])

  // A successful save or cancel swaps the form or dialog for a success banner, which hides itself after a few seconds
  const isSaved = isFormOpen && saveStatus === 'success'
  useEffect(() => {
    if (!isSaved) return
    const timer = window.setTimeout(closeForm, BANNER_MS)
    return () => window.clearTimeout(timer)
  }, [isSaved, closeForm])

  const isCancelled = cancelTarget !== null && cancelStatus === 'success'
  useEffect(() => {
    if (!isCancelled) return
    const timer = window.setTimeout(closeCancel, BANNER_MS)
    return () => window.clearTimeout(timer)
  }, [isCancelled, closeCancel])

  // The list hook stays mounted while the detail view or form is open, so its query and page are kept
  if (selectedId) return <SalesInvoiceDetail />
  if (isFormOpen && !isSaved) return <SalesInvoiceForm onClose={closeForm} />

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && salesInvoices.length === 0
  const hasActiveFilters = query.searchTerm !== '' || query.status !== 'all' || query.fromDate !== '' || query.toDate !== ''
  const statusLabel = statusOptions.find((option) => option.value === query.status)?.label ?? 'All Status'
  const showTable = !isInitialLoad && listStatus !== 'error'

  return (
    <div className="sales-invoices-page">
      <header className="sales-invoices-header">
        <div>
          <h1>Sales Invoices</h1>
          <p>{salesInvoices.length} {salesInvoices.length === 1 ? 'invoice' : 'invoices'} on this page</p>
        </div>
        <div className="sales-invoices-header__actions">
          <Button appearance="primary" icon={<Add20Regular />} onClick={openForm}>New Invoice</Button>
          <Button disabled={salesInvoices.length === 0} onClick={() => exportSalesInvoices(salesInvoices, salespersonName)}>Export</Button>
        </div>
      </header>

      {isSaved && (
        <MessageBar intent="success" className="sales-invoices-message">
          <MessageBarBody>{saveMode === 'post' ? 'Invoice posted successfully.' : 'Draft saved successfully.'}</MessageBarBody>
          <MessageBarActions>
            <Button appearance="transparent" size="small" onClick={closeForm}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isCancelled && (
        <MessageBar intent="success" className="sales-invoices-message">
          <MessageBarBody>Invoice {cancelTarget.number} cancelled. The vehicle is available again.</MessageBarBody>
          <MessageBarActions>
            <Button appearance="transparent" size="small" onClick={closeCancel}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <div className="sales-invoices-filters">
        <SearchBox
          className="sales-invoices-filters__search"
          aria-label="Search invoices"
          placeholder="Search invoices..."
          value={searchInput}
          onChange={(_, data) => setSearchInput(data.value)}
        />
        <Input
          className="sales-invoices-filters__date"
          type="date"
          aria-label="From date"
          value={query.fromDate}
          max={query.toDate || undefined}
          onChange={(_, data) => setFromDate(data.value)}
        />
        <Input
          className="sales-invoices-filters__date"
          type="date"
          aria-label="To date"
          value={query.toDate}
          min={query.fromDate || undefined}
          onChange={(_, data) => setToDate(data.value)}
        />
        <Dropdown
          className="sales-invoices-filters__status"
          aria-label="Filter by status"
          value={statusLabel}
          selectedOptions={[query.status]}
          onOptionSelect={(_, data) => { if (isStatusFilter(data.optionValue)) setStatusFilter(data.optionValue) }}
        >
          {statusOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
      </div>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="sales-invoices-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load sales invoices</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card sales-invoices-loading">
          <Spinner label="Loading sales invoices…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Sales invoices" aria-busy={isLoading} className="data-table sales-invoices-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Invoice #</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Vehicle / VIN</TableHeaderCell>
                  <TableHeaderCell>Salesperson</TableHeaderCell>
                  <TableHeaderCell className="num">Sale Price</TableHeaderCell>
                  <TableHeaderCell className="num">Tax</TableHeaderCell>
                  <TableHeaderCell className="num">Total</TableHeaderCell>
                  <TableHeaderCell className="num">Paid</TableHeaderCell>
                  <TableHeaderCell className="num">Balance</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesInvoices.map((invoice) => {
                  const isDraft = invoice.lifecycle === 'draft'
                  return (
                    <TableRow key={invoice.id || invoice.number} className={isDraft ? 'is-draft' : undefined}>
                      <TableCell>
                        <Link as="button" className="mono text-xs" disabled={!invoice.id} onClick={() => openSalesInvoice(invoice.id)}>
                          {invoice.number || '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted">{invoice.invoiceDate || '—'}</TableCell>
                      <TableCell className="strong text-secondary">{invoice.customerName || '—'}</TableCell>
                      <TableCell>
                        <div className="vehicle-cell">
                          <span>{invoice.vehicle || '—'}</span>
                          <span className="mono text-xs text-faint">{invoice.vin ? shortVin(invoice.vin) : '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted">{salespersonName(invoice.salespersonId) || '—'}</TableCell>
                      <TableCell className="num">{formatCurrency(invoice.salePrice)}</TableCell>
                      <TableCell className="num text-muted">{formatCurrency(invoice.tax)}</TableCell>
                      <TableCell className="num strong">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className={`num ${isDraft ? 'text-faint' : 'text-green'}`}>{isDraft ? '—' : formatCurrency(invoice.paid)}</TableCell>
                      <TableCell className={`num strong ${!isDraft && invoice.balance > 0 ? 'text-amber' : 'text-faint'}`}>
                        {!isDraft && invoice.balance > 0 ? formatCurrency(invoice.balance) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="badge-group">
                          {statusBadges(invoice).map((badge) => <span key={badge.label} className={`badge ${badge.className}`}>{badge.label}</span>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="row-actions">
                          <Tooltip content="View" relationship="label">
                            <Button
                              appearance="subtle"
                              size="small"
                              icon={<Eye20Regular />}
                              aria-label={`View invoice ${invoice.number}`}
                              disabled={!invoice.id}
                              onClick={() => openSalesInvoice(invoice.id)}
                            />
                          </Tooltip>
                          {canCancel(invoice) && (
                            <Tooltip content="Cancel invoice" relationship="label">
                              <Button
                                appearance="subtle"
                                size="small"
                                className="row-actions__danger"
                                icon={<DismissCircle20Regular />}
                                aria-label={`Cancel invoice ${invoice.number}`}
                                onClick={() => openCancel(invoice)}
                              />
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {salesInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more sales invoices on this page.'
                        : <>No sales invoices found.{hasActiveFilters && ' Try clearing the search, dates or status filter.'}</>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={salesInvoices.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="sales invoices"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}

      {cancelTarget && !isCancelled && <CancelSalesInvoiceDialog invoice={cancelTarget} onClose={closeCancel} />}
    </div>
  )
}
