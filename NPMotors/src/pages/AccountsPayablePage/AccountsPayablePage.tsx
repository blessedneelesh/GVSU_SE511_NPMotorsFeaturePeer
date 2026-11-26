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
import { usePayableDetail } from '../../hooks/usePayableDetail'
import { usePayables } from '../../hooks/usePayables'
import { usePayableVendorOptions } from '../../hooks/usePayableVendorOptions'
import type { Payable, PayableStatusFilter } from '../../types/payables'
import { daysClass, formatCurrency, formatDays, statusBadgeClass, sumPage } from './payableMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import { MakePaymentDialog } from './MakePaymentDialog'
import { PayableDetail } from './PayableDetail'
import { useMakePaymentDialog } from './useMakePaymentDialog'
import './AccountsPayablePage.css'

const pageSizeOptions = [5, 10, 25, 50]

const ALL_VENDORS = 'all'

// The API's Status values; "unpaid" and "partial" only return bills that aren't due yet ("All Status" means every
// open bill). Settled bills are never listed, so there is no "Paid" option.
const statusOptions: { value: PayableStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'unpaid', label: 'Unpaid (not yet due)' },
  { value: 'partial', label: 'Partial (not yet due)' },
]

const isStatusFilter = (value: unknown): value is PayableStatusFilter =>
  statusOptions.some((option) => option.value === value)

function exportPayables(rows: Payable[]) {
  const header = ['Bill', 'Vendor', 'Bill Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Days Overdue', 'Aging', 'Status']
  const lines = [header, ...rows.map((r) => [r.number, r.vendorName, r.date, r.dueDate, String(r.amount), String(r.paid), String(r.balance), String(r.daysOverdue), r.agingBucket, r.status])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'accounts-payable.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function AccountsPayablePage() {
  const {
    payables,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    setStatusFilter,
    setVendorFilter,
    setAsOfDate,
    resetFilters,
    setPage,
    setPageSize,
    retry,
  } = usePayables()
  const { vendorOptions } = usePayableVendorOptions()
  const { selectedId, openPayable } = usePayableDetail()
  const { paying, openPay, closePay } = useMakePaymentDialog()

  // The list hook stays mounted, so the filters and page survive the round trip
  if (selectedId) return <PayableDetail />

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && payables.length === 0
  const hasActiveFilters = query.status !== 'all' || query.vendorId !== ALL_VENDORS || query.asOfDate !== ''
  const statusLabel = statusOptions.find((option) => option.value === query.status)?.label ?? 'All Status'
  // Until the options load, a selected vendor shows its id rather than going blank
  const vendorLabel = query.vendorId === ALL_VENDORS
    ? 'All Vendors'
    : vendorOptions.find((option) => option.id === query.vendorId)?.name ?? `Vendor #${query.vendorId}`
  const showTable = !isInitialLoad && listStatus !== 'error'
  const pageTotals = sumPage(payables)

  return (
    <div className="payables-page">
      <header className="payables-header">
        <div>
          <h1>Accounts Payable</h1>
          <p>Outstanding vendor balances · {payables.length} {payables.length === 1 ? 'bill' : 'bills'} on this page</p>
        </div>
        <div className="payables-header__actions">
          <Button disabled={payables.length === 0} onClick={() => exportPayables(payables)}>Export</Button>
        </div>
      </header>

      <section className="payables-filters" aria-label="Filters">
        <Field label="Status">
          <Dropdown
            value={statusLabel}
            selectedOptions={[query.status]}
            onOptionSelect={(_, data) => { if (isStatusFilter(data.optionValue)) setStatusFilter(data.optionValue) }}
          >
            {statusOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
          </Dropdown>
        </Field>
        <Field label="Vendor">
          <Dropdown
            value={vendorLabel}
            selectedOptions={[query.vendorId]}
            onOptionSelect={(_, data) => { if (data.optionValue) setVendorFilter(data.optionValue) }}
          >
            <Option value={ALL_VENDORS}>All Vendors</Option>
            {vendorOptions.map((option) => <Option key={option.id} value={option.id}>{option.name}</Option>)}
          </Dropdown>
        </Field>
        <Field label="Aging as of" hint={query.asOfDate ? undefined : 'Today'}>
          <Input type="date" value={query.asOfDate} onChange={(_, data) => setAsOfDate(data.value)} />
        </Field>
        <div className="payables-filters__reset">
          <Button disabled={!hasActiveFilters} onClick={resetFilters}>Clear</Button>
        </div>
      </section>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="payables-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load payables</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card payables-loading">
          <Spinner label="Loading payables…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Accounts payable" aria-busy={isLoading} className="data-table payables-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Bill #</TableHeaderCell>
                  <TableHeaderCell>Vendor</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Due Date</TableHeaderCell>
                  <TableHeaderCell className="num">Amount</TableHeaderCell>
                  <TableHeaderCell className="num">Paid</TableHeaderCell>
                  <TableHeaderCell className="num">Balance</TableHeaderCell>
                  <TableHeaderCell>Age</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="payable-actions">Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((payable) => (
                  <TableRow key={payable.id || `${payable.number}-${payable.dueDate}`}>
                    <TableCell>
                      <Link as="button" className="payable-link" disabled={!payable.id} onClick={() => openPayable(payable.id)}>
                        {payable.number || '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="strong text-dark">{payable.vendorName || '—'}</TableCell>
                    <TableCell className="text-xs text-muted">{payable.date || '—'}</TableCell>
                    <TableCell className="text-xs text-muted">{payable.dueDate || '—'}</TableCell>
                    <TableCell className="num text-secondary">{formatCurrency(payable.amount)}</TableCell>
                    <TableCell className="num text-green">{formatCurrency(payable.paid)}</TableCell>
                    <TableCell className={`num strong ${payable.balance > 0 ? 'text-red' : 'text-faint'}`}>{formatCurrency(payable.balance)}</TableCell>
                    <TableCell className={`text-xs strong ${daysClass(payable.daysOverdue)}`}>{formatDays(payable.daysOverdue)}</TableCell>
                    <TableCell>
                      <span className={`badge ${statusBadgeClass(payable.status)}`}>{payable.status}</span>
                    </TableCell>
                    <TableCell className="payable-actions">
                      {/* Only bills with something left to pay can take a payment */}
                      {payable.balance > 0 && payable.id && (
                        <Button
                          size="small"
                          appearance="subtle"
                          aria-label={`Pay ${payable.number || 'this bill'}`}
                          onClick={() => openPay(payable)}
                        >
                          Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {payables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more payables on this page.'
                        : <>No outstanding payables found.{hasActiveFilters && ' Try clearing the filters.'}</>}
                    </TableCell>
                  </TableRow>
                )}
                {payables.length > 0 && (
                  <TableRow className="payables-total-row">
                    <TableCell colSpan={4}>
                      Page total ({payables.length} {payables.length === 1 ? 'bill' : 'bills'})
                    </TableCell>
                    <TableCell className="num">{formatCurrency(pageTotals.amount)}</TableCell>
                    <TableCell className="num text-green">{formatCurrency(pageTotals.paid)}</TableCell>
                    <TableCell className="num text-red">{formatCurrency(pageTotals.balance)}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={payables.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="payables"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}

      {paying && <MakePaymentDialog bill={paying} onClose={closePay} />}
    </div>
  )
}
