import {
  Button,
  Dropdown,
  Field,
  Input,
  Link,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components'
import { useReceivableCustomerOptions } from '../../hooks/useReceivableCustomerOptions'
import { useReceivableDetail } from '../../hooks/useReceivableDetail'
import { useReceivables } from '../../hooks/useReceivables'
import type { Receivable, ReceivableStatusFilter } from '../../types/receivables'
import { daysClass, formatCurrency, formatDays, statusBadgeClass, sumPage } from './receivableMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import { ReceivableDetail } from './ReceivableDetail'
import './AccountsReceivablePage.css'

const pageSizeOptions = [5, 10, 25, 50]

const ALL_CUSTOMERS = 'all'

// The API's Status values; "unpaid" and "partial" only return invoices that aren't due yet,
// and settled invoices only come back under "paid" ("All Status" means every open invoice)
const statusOptions: { value: ReceivableStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'unpaid', label: 'Unpaid (not yet due)' },
  { value: 'partial', label: 'Partial (not yet due)' },
  { value: 'paid', label: 'Paid' },
]

const isStatusFilter = (value: unknown): value is ReceivableStatusFilter =>
  statusOptions.some((option) => option.value === value)

function exportReceivables(rows: Receivable[]) {
  const header = ['AR Invoice', 'Sales Invoice', 'Customer', 'Due Date', 'Amount', 'Paid', 'Balance', 'Days Overdue', 'Status']
  const lines = [header, ...rows.map((r) => [r.number, r.invoiceNumber, r.customerName, r.dueDate, String(r.amount), String(r.paid), String(r.balance), String(r.daysOverdue), r.agingStatus])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'accounts-receivable.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function AccountsReceivablePage() {
  const {
    receivables,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    setStatusFilter,
    setCustomerFilter,
    setAsOfDate,
    resetFilters,
    setPage,
    setPageSize,
    retry,
  } = useReceivables()
  const { customerOptions } = useReceivableCustomerOptions()
  const { selectedId, openReceivable } = useReceivableDetail()

  // The list hook stays mounted, so the filters and page survive the round trip
  if (selectedId) return <ReceivableDetail />

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && receivables.length === 0
  const hasActiveFilters = query.status !== 'all' || query.customerId !== ALL_CUSTOMERS || query.asOfDate !== ''
  const statusLabel = statusOptions.find((option) => option.value === query.status)?.label ?? 'All Status'
  // Until the options load, a selected customer shows its id rather than going blank
  const customerLabel = query.customerId === ALL_CUSTOMERS
    ? 'All Customers'
    : customerOptions.find((option) => option.id === query.customerId)?.name ?? `Customer #${query.customerId}`
  const showTable = !isInitialLoad && listStatus !== 'error'
  const pageTotals = sumPage(receivables)

  return (
    <div className="receivables-page">
      <header className="receivables-header">
        <div>
          <h1>Accounts Receivable</h1>
          <p>Outstanding customer balances · {receivables.length} {receivables.length === 1 ? 'invoice' : 'invoices'} on this page</p>
        </div>
        <div className="receivables-header__actions">
          <Button disabled={receivables.length === 0} onClick={() => exportReceivables(receivables)}>Export</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </header>

      <section className="receivables-filters" aria-label="Filters">
        <Field label="Status">
          <Dropdown
            value={statusLabel}
            selectedOptions={[query.status]}
            onOptionSelect={(_, data) => { if (isStatusFilter(data.optionValue)) setStatusFilter(data.optionValue) }}
          >
            {statusOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
          </Dropdown>
        </Field>
        <Field label="Customer">
          <Dropdown
            value={customerLabel}
            selectedOptions={[query.customerId]}
            onOptionSelect={(_, data) => { if (data.optionValue) setCustomerFilter(data.optionValue) }}
          >
            <Option value={ALL_CUSTOMERS}>All Customers</Option>
            {customerOptions.map((option) => <Option key={option.id} value={option.id}>{option.name}</Option>)}
          </Dropdown>
        </Field>
        <Field label="Aging as of" hint={query.asOfDate ? undefined : 'Today'}>
          <Input type="date" value={query.asOfDate} onChange={(_, data) => setAsOfDate(data.value)} />
        </Field>
        <div className="receivables-filters__reset">
          <Button disabled={!hasActiveFilters} onClick={resetFilters}>Clear</Button>
        </div>
      </section>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="receivables-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load receivables</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card receivables-loading">
          <Spinner label="Loading receivables…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Accounts receivable" aria-busy={isLoading} className="data-table receivables-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Invoice #</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Due Date</TableHeaderCell>
                  <TableHeaderCell className="num">Amount</TableHeaderCell>
                  <TableHeaderCell className="num">Paid</TableHeaderCell>
                  <TableHeaderCell className="num">Balance</TableHeaderCell>
                  <TableHeaderCell>Days</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.map((receivable) => (
                  <TableRow key={receivable.id || `${receivable.number}-${receivable.dueDate}`}>
                    <TableCell>
                      <div className="receivable-cell">
                        <Link as="button" className="receivable-link" disabled={!receivable.id} onClick={() => openReceivable(receivable.id)}>
                          {receivable.number || '—'}
                        </Link>
                        {receivable.invoiceNumber && receivable.invoiceNumber !== receivable.number && (
                          <span className="text-xs text-faint">for {receivable.invoiceNumber}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="strong text-dark">{receivable.customerName || '—'}</TableCell>
                    <TableCell className="text-xs text-muted">{receivable.dueDate || '—'}</TableCell>
                    <TableCell className="num text-secondary">{formatCurrency(receivable.amount)}</TableCell>
                    <TableCell className="num text-green">{formatCurrency(receivable.paid)}</TableCell>
                    <TableCell className={`num strong ${receivable.balance > 0 ? 'text-amber' : 'text-faint'}`}>{formatCurrency(receivable.balance)}</TableCell>
                    {/* A settled invoice can't be overdue, though the API still counts days past its due date */}
                    {receivable.balance > 0
                      ? <TableCell className={`text-xs strong ${daysClass(receivable.daysOverdue)}`}>{formatDays(receivable.daysOverdue)}</TableCell>
                      : <TableCell className="text-xs text-faint">—</TableCell>}
                    <TableCell>
                      <span className={`badge ${statusBadgeClass(receivable.agingStatus)}`}>{receivable.agingStatus}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {receivables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more receivables on this page.'
                        : <>No {query.status === 'paid' ? 'paid' : 'outstanding'} receivables found.{hasActiveFilters && ' Try clearing the filters.'}</>}
                    </TableCell>
                  </TableRow>
                )}
                {receivables.length > 0 && (
                  <TableRow className="receivables-total-row">
                    <TableCell colSpan={3}>
                      Page total ({receivables.length} {receivables.length === 1 ? 'invoice' : 'invoices'})
                    </TableCell>
                    <TableCell className="num">{formatCurrency(pageTotals.amount)}</TableCell>
                    <TableCell className="num text-green">{formatCurrency(pageTotals.paid)}</TableCell>
                    <TableCell className="num text-amber">{formatCurrency(pageTotals.balance)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={receivables.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="receivables"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}

    </div>
  )
}
