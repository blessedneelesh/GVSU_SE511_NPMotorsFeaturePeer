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
import { LockClosed16Regular } from '@fluentui/react-icons'
import { useTransactionAccountOptions } from '../../hooks/useTransactionAccountOptions'
import { useTransactionDetail } from '../../hooks/useTransactionDetail'
import { useTransactions } from '../../hooks/useTransactions'
import type { Transaction, TransactionDirectionFilter } from '../../types/transactions'
import { TransactionDetail } from './TransactionDetail'
import { DIRECTION_LABELS, formatSignedAmount, statusBadgeClass } from './transactionMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './TransactionsPage.css'

const pageSizeOptions = [5, 10, 25, 50]

const directionOptions: { value: TransactionDirectionFilter; label: string }[] = [
  { value: 'all', label: 'All Directions' },
  { value: 'in', label: DIRECTION_LABELS.in },
  { value: 'out', label: DIRECTION_LABELS.out },
]

const isDirectionFilter = (value: unknown): value is TransactionDirectionFilter =>
  directionOptions.some((option) => option.value === value)

function exportTransactions(rows: Transaction[]) {
  const header = ['Date', 'Transaction #', 'ID', 'Source Type', 'Source #', 'Bank Account', 'Party', 'Direction', 'Amount', 'Status', 'Description']
  const lines = [header, ...rows.map((t) => [t.date, t.number, t.id, t.type, t.sourceNumber, t.bankAccountName, t.party, DIRECTION_LABELS[t.direction], String(t.amount), t.status, t.description])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'transactions.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function TransactionsPage() {
  const {
    transactions,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    setBankAccountFilter,
    setDirectionFilter,
    setDateFrom,
    setDateTo,
    resetFilters,
    setPage,
    setPageSize,
    retry,
  } = useTransactions()
  const { selectedId, openTransaction } = useTransactionDetail()
  const { accountOptions } = useTransactionAccountOptions()

  // The list hook stays mounted while the detail view is open, so its query and page are kept
  if (selectedId) return <TransactionDetail />

  // Built from the loaded accounts, so the guard below also rejects ids that are no longer offered
  const accountFilterOptions = [
    { value: 'all', label: 'All Accounts' },
    ...accountOptions.map((account) => ({
      value: account.id,
      label: account.accountNumber ? `${account.name} · ${account.accountNumber}` : account.name,
    })),
  ]
  const isAccountFilter = (value: unknown): value is string => accountFilterOptions.some((option) => option.value === value)
  // GetAllTransactions has no account number, so it's looked up from the filter's accounts
  const accountNumberOf = (id: string) => accountOptions.find((account) => account.id === id)?.accountNumber ?? ''

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && transactions.length === 0
  const hasActiveFilters = query.bankAccountId !== 'all' || query.direction !== 'all' || query.dateFrom !== '' || query.dateTo !== ''
  const accountLabel = accountFilterOptions.find((option) => option.value === query.bankAccountId)?.label ?? 'All Accounts'
  const directionLabel = directionOptions.find((option) => option.value === query.direction)?.label ?? 'All Directions'
  const showTable = !isInitialLoad && listStatus !== 'error'

  return (
    <div className="transactions-page">
      <header className="transactions-header">
        <div>
          <h1>Transactions</h1>
          <p>Internal bank movement ledger · {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} on this page</p>
        </div>
        <div className="transactions-header__actions">
          <span className="transactions-note"><LockClosed16Regular aria-hidden="true" /> Posted transactions are read-only</span>
          <Button disabled={transactions.length === 0} onClick={() => exportTransactions(transactions)}>Export</Button>
        </div>
      </header>

      <section className="card transactions-filters" aria-label="Filters">
        <Field label="Bank Account">
          <Dropdown
            value={accountLabel}
            selectedOptions={[query.bankAccountId]}
            onOptionSelect={(_, data) => { if (isAccountFilter(data.optionValue)) setBankAccountFilter(data.optionValue) }}
          >
            {accountFilterOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
          </Dropdown>
        </Field>
        <Field label="Direction">
          <Dropdown
            value={directionLabel}
            selectedOptions={[query.direction]}
            onOptionSelect={(_, data) => { if (isDirectionFilter(data.optionValue)) setDirectionFilter(data.optionValue) }}
          >
            {directionOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
          </Dropdown>
        </Field>
        <Field label="From Date">
          <Input type="date" value={query.dateFrom} max={query.dateTo || undefined} onChange={(_, data) => setDateFrom(data.value)} />
        </Field>
        <Field label="To Date">
          <Input type="date" value={query.dateTo} min={query.dateFrom || undefined} onChange={(_, data) => setDateTo(data.value)} />
        </Field>
        <div className="transactions-filters__reset">
          <Button disabled={!hasActiveFilters} onClick={resetFilters}>Reset</Button>
        </div>
      </section>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="transactions-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load transactions</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card transactions-loading">
          <Spinner label="Loading transactions…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Transactions" aria-busy={isLoading} className="data-table transactions-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Transaction #</TableHeaderCell>
                  <TableHeaderCell>Source type</TableHeaderCell>
                  <TableHeaderCell>Bank account</TableHeaderCell>
                  <TableHeaderCell>Party</TableHeaderCell>
                  <TableHeaderCell>Direction</TableHeaderCell>
                  <TableHeaderCell className="num">Amount</TableHeaderCell>
                  <TableHeaderCell>Posting status</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id || transaction.number}>
                    <TableCell className="text-xs text-muted">{transaction.date || '—'}</TableCell>
                    <TableCell>
                      <div className="transaction-cell">
                        <Link as="button" className="mono text-xs" disabled={!transaction.id} onClick={() => openTransaction(transaction.id)}>
                          {transaction.number || 'Transaction'}
                        </Link>
                        <span className="text-xs text-faint">{transaction.id || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.type ? <span className="type-chip">{transaction.type}</span> : '—'}</TableCell>
                    <TableCell>
                      <div className="transaction-cell">
                        <span className="strong text-dark">{transaction.bankAccountName || '—'}</span>
                        {accountNumberOf(transaction.bankAccountId) && (
                          <span className="mono text-xs text-faint">{accountNumberOf(transaction.bankAccountId)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{transaction.party || '—'}</TableCell>
                    <TableCell>
                      <span className={`badge ${transaction.direction === 'in' ? 'badge-posted' : 'badge-cancelled'}`}>{DIRECTION_LABELS[transaction.direction]}</span>
                    </TableCell>
                    <TableCell className={`num strong ${transaction.direction === 'in' ? 'text-green' : 'text-red'}`}>
                      {formatSignedAmount(transaction)}
                    </TableCell>
                    <TableCell>
                      {transaction.status ? <span className={`badge ${statusBadgeClass(transaction.status)}`}>{transaction.status}</span> : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted description-cell">{transaction.description || '—'}</TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more transactions on this page.'
                        : <>No transactions found.{hasActiveFilters && ' Try resetting the filters.'}</>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={transactions.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="transactions"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}
    </div>
  )
}
