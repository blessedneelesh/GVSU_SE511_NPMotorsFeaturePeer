import {
  Button,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Spinner,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TabList,
} from '@fluentui/react-components'
import { BuildingBank24Regular } from '@fluentui/react-icons'
import { useStatementLineAccountOptions } from '../../hooks/useStatementLineAccountOptions'
import { useStatementLines } from '../../hooks/useStatementLines'
import type { StatementLine, StatementLineTypeFilter } from '../../types/statementLines'
import { formatAmount, matchStatusBadgeClass, statementStatusBadgeClass, sumPage, typeChipClass } from './statementLineMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './StatementLinesPage.css'

const pageSizeOptions = [5, 10, 25, 50]

const ALL_ACCOUNTS = 'all'

// Values are the API's Type enum names; it ignores anything else
const typeOptions: { value: StatementLineTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'BankReceipt', label: 'Bank Receipt' },
  { value: 'BankPayment', label: 'Bank Payment' },
  { value: 'Transfer', label: 'Transfer' },
  { value: 'BankInterest', label: 'Bank Interest' },
  { value: 'BankCharge', label: 'Bank Charge' },
  { value: 'Payroll', label: 'Payroll' },
  { value: 'Reversal', label: 'Reversal' },
]

const isTypeFilter = (value: unknown): value is StatementLineTypeFilter =>
  typeOptions.some((option) => option.value === value)

function exportStatementLines(rows: StatementLine[]) {
  const header = ['Date', 'Reference', 'Description', 'Party', 'Type', 'Bank Account', 'Debit (In)', 'Credit (Out)', 'Balance', 'Statement Status', 'Match Status']
  const lines = [header, ...rows.map((l) => [l.date, l.reference, l.description, l.party, l.type, l.bankAccountName, String(l.deposit), String(l.withdrawal), String(l.runningBalance), l.statementStatus, l.matchStatus])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'bank-statement.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function StatementLinesPage() {
  const {
    statementLines,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    setBankAccountFilter,
    setMonthFilter,
    setTypeFilter,
    resetFilters,
    setPage,
    setPageSize,
    retry,
  } = useStatementLines()
  const { accountOptions } = useStatementLineAccountOptions()

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && statementLines.length === 0
  const hasActiveFilters = query.month !== '' || query.type !== 'all'
  const typeLabel = typeOptions.find((option) => option.value === query.type)?.label ?? 'All Types'
  const showTable = !isInitialLoad && listStatus !== 'error'

  const account = accountOptions.find((option) => option.id === query.bankAccountId)
  const pageTotals = sumPage(statementLines)
  // Running balances are per account, so a closing balance only makes sense with one account selected
  const closingBalance = account ? (statementLines.at(-1)?.runningBalance ?? null) : null

  return (
    <div className="statement-lines-page">
      <header className="statement-lines-header">
        <div>
          <h1>Bank Statement</h1>
          <p>Simulated bank feed · {statementLines.length} {statementLines.length === 1 ? 'line' : 'lines'} on this page</p>
        </div>
        <div className="statement-lines-header__actions">
          <Button disabled={statementLines.length === 0} onClick={() => exportStatementLines(statementLines)}>Export CSV</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </header>

      <TabList
        className="statement-account-tabs"
        aria-label="Bank accounts"
        selectedValue={query.bankAccountId}
        onTabSelect={(_, data) => { if (typeof data.value === 'string') setBankAccountFilter(data.value) }}
      >
        <Tab value={ALL_ACCOUNTS} className="statement-account-tab">
          <span className="statement-account-tab__name">All Accounts</span>
          <span className="statement-account-tab__number">Every account</span>
        </Tab>
        {accountOptions.map((option) => (
          <Tab key={option.id} value={option.id} className="statement-account-tab">
            <span className="statement-account-tab__name">{option.name || 'Account'}</span>
            <span className="statement-account-tab__number">{option.accountNumber || '—'}</span>
          </Tab>
        ))}
      </TabList>

      {account && (
        <section className="card statement-account-summary" aria-label="Account summary">
          <div className="statement-account-summary__icon" aria-hidden="true"><BuildingBank24Regular /></div>
          <div className="statement-account-summary__info">
            <div className="statement-account-summary__name">{account.name}</div>
            <div className="statement-account-summary__meta">
              {[account.bankName, account.accountNumber, account.type].filter(Boolean).join(' · ') || '—'}
            </div>
            {account.routing && <div className="statement-account-summary__routing">Routing: {account.routing}</div>}
          </div>
          <div className="statement-account-summary__balance">
            <div className="statement-account-summary__label">Book Balance</div>
            <div className="statement-account-summary__value">{formatAmount(account.bookBalance)}</div>
          </div>
        </section>
      )}

      <section className="statement-lines-filters" aria-label="Filters">
        <Field label="Month">
          <Input type="month" value={query.month} onChange={(_, data) => setMonthFilter(data.value)} />
        </Field>
        <Field label="Type">
          <Dropdown
            value={typeLabel}
            selectedOptions={[query.type]}
            onOptionSelect={(_, data) => { if (isTypeFilter(data.optionValue)) setTypeFilter(data.optionValue) }}
          >
            {typeOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
          </Dropdown>
        </Field>
        <div className="statement-lines-filters__reset">
          <Button disabled={!hasActiveFilters} onClick={resetFilters}>Clear</Button>
        </div>
      </section>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="statement-lines-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load the bank statement</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card statement-lines-loading">
          <Spinner label="Loading bank statement…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Bank statement" aria-busy={isLoading} className="data-table statement-lines-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Reference</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Party</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell className="num">Debit (In)</TableHeaderCell>
                  <TableHeaderCell className="num">Credit (Out)</TableHeaderCell>
                  <TableHeaderCell className="num">Balance</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementLines.map((line) => (
                  <TableRow key={line.id || `${line.bankAccountId}-${line.reference}-${line.date}`}>
                    <TableCell className="text-xs text-muted">{line.date || '—'}</TableCell>
                    <TableCell className="mono text-xs text-accent">{line.reference || '—'}</TableCell>
                    <TableCell>
                      <div className="statement-line-cell">
                        <span className="strong text-dark">{line.description || '—'}</span>
                        {!account && line.bankAccountName && <span className="text-xs text-faint">{line.bankAccountName}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted">{line.party || '—'}</TableCell>
                    <TableCell>{line.type ? <span className={`type-chip ${typeChipClass(line.type)}`}>{line.type}</span> : '—'}</TableCell>
                    <TableCell className="num">
                      {line.deposit > 0 ? <span className="strong text-green">{formatAmount(line.deposit)}</span> : <span className="text-faint">—</span>}
                    </TableCell>
                    <TableCell className="num">
                      {line.withdrawal > 0 ? <span className="strong text-red">{formatAmount(line.withdrawal)}</span> : <span className="text-faint">—</span>}
                    </TableCell>
                    <TableCell className="num strong text-dark">{formatAmount(line.runningBalance)}</TableCell>
                    <TableCell>
                      <div className="statement-line-badges">
                        {line.statementStatus && <span className={`badge ${statementStatusBadgeClass(line.statementStatus)}`}>{line.statementStatus}</span>}
                        {line.matchStatus && <span className={`badge ${matchStatusBadgeClass(line.matchStatus)}`}>{line.matchStatus}</span>}
                        {!line.statementStatus && !line.matchStatus && '—'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {statementLines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more statement lines on this page.'
                        : <>No statement lines found.{hasActiveFilters && ' Try clearing the filters.'}</>}
                    </TableCell>
                  </TableRow>
                )}
                {statementLines.length > 0 && (
                  <TableRow className="statement-total-row">
                    <TableCell colSpan={5}>
                      {account ? `Page total — ${account.name}` : 'Page total'} ({statementLines.length} {statementLines.length === 1 ? 'row' : 'rows'})
                    </TableCell>
                    <TableCell className="num statement-total-row__in">{formatAmount(pageTotals.deposits)}</TableCell>
                    <TableCell className="num statement-total-row__out">{formatAmount(pageTotals.withdrawals)}</TableCell>
                    <TableCell className="num">{closingBalance === null ? '—' : formatAmount(closingBalance)}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={statementLines.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="statement lines"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}
    </div>
  )
}
