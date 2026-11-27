import { useMemo } from 'react'
import {
  Button,
  Dropdown,
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
import { ArrowDownload20Regular, Print20Regular } from '@fluentui/react-icons'
import { useProfitLoss } from '../../hooks/useProfitLoss'
import type { ReportPeriodType } from '../../types/reports'
import {
  buildStatement,
  formatAmount,
  formatMonth,
  formatPercent,
  formatSigned,
  lineChange,
  monthOptions,
  periodLabel,
  periodTypeOptions,
  type ChangeDisplay,
  type StatementLine,
} from './profitLossMetrics'
import './ProfitLossPage.css'

const isPeriodType = (value: unknown): value is ReportPeriodType =>
  periodTypeOptions.some((option) => option.value === value)

function exportStatement(lines: StatementLine[], currentLabel: string, previousLabel: string) {
  const header = ['Category', currentLabel, previousLabel, 'Change']
  const rows = lines.map((line) => (line.kind === 'section'
    ? [line.label, '', '', '']
    // "▲ 12.5%" → "+12.5%" so spreadsheets don't need the arrow glyphs
    : [line.label, line.current.toFixed(2), line.previous.toFixed(2), lineChange(line).label.replace('▲ ', '+').replace('▼ ', '-')]))
  const csv = [header, ...rows].map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'profit-and-loss.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function ChangeCell({ change }: { change: ChangeDisplay }) {
  return <span className={`pl-change pl-change--${change.tone}`}>{change.label}</span>
}

export function ProfitLossPage() {
  const { comparison, query, status, error, setPeriodType, setAnchorMonth, retry } = useProfitLoss()
  const months = useMemo(() => monthOptions(), [])
  const lines = useMemo(() => (comparison ? buildStatement(comparison) : []), [comparison])

  const isLoading = status === 'loading'
  const isInitialLoad = (isLoading || status === 'idle') && comparison === null
  const showReport = comparison !== null && status !== 'error'
  const periodTypeLabel = periodTypeOptions.find((option) => option.value === query.periodType)?.label ?? 'Month'
  const anchorLabel = months.find((option) => option.value === query.anchorMonth)?.label ?? formatMonth(query.anchorMonth)

  const current = comparison?.current
  const previous = comparison?.previous
  const currentLabel = current ? periodLabel(current) : ''
  const previousLabel = previous ? periodLabel(previous) : ''

  return (
    <div className="profit-loss-page">
      <header className="profit-loss-header">
        <div>
          <h1>Profit &amp; Loss Statement</h1>
          <p>NPMotors{current && previous ? ` · ${currentLabel} vs ${previousLabel}` : ''}</p>
        </div>
        <div className="profit-loss-header__actions">
          <Dropdown
            className="profit-loss-filters__month"
            aria-label="Anchor month"
            value={anchorLabel}
            selectedOptions={[query.anchorMonth]}
            onOptionSelect={(_, data) => { if (data.optionValue) setAnchorMonth(data.optionValue) }}
          >
            {months.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
          </Dropdown>
          <Dropdown
            className="profit-loss-filters__period"
            aria-label="Period"
            value={periodTypeLabel}
            selectedOptions={[query.periodType]}
            onOptionSelect={(_, data) => { if (isPeriodType(data.optionValue)) setPeriodType(data.optionValue) }}
          >
            {periodTypeOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
          </Dropdown>
          <Button icon={<ArrowDownload20Regular />} disabled={!showReport} onClick={() => exportStatement(lines, currentLabel, previousLabel)}>Export</Button>
          <Button icon={<Print20Regular />} disabled={!showReport} onClick={() => window.print()}>Print</Button>
        </div>
      </header>

      <MessageBar intent="info" className="profit-loss-message">
        <MessageBarBody>
          Accrual report from posted Sales Invoices, Vehicle Inventory, Employees, and categorized bank payments.
          Sales tax and customer or vendor settlements are excluded from profit.
        </MessageBarBody>
      </MessageBar>

      {status === 'error' && (
        <MessageBar intent="error" className="profit-loss-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load the profit and loss statement</MessageBarTitle>
            {error}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card profit-loss-loading">
          <Spinner label="Loading profit and loss…" />
        </section>
      )}

      {showReport && current && previous && (
        <div className={isLoading ? 'is-refreshing' : ''} aria-busy={isLoading}>
          <div className="profit-loss-stats">
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value stat-value--blue">{formatAmount(current.totalRevenue)}</div>
              <div className="stat-sub">Previous: {formatAmount(previous.totalRevenue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Gross Profit</div>
              <div className={`stat-value ${current.grossProfit >= 0 ? 'stat-value--green' : 'stat-value--red'}`}>{formatSigned(current.grossProfit)}</div>
              <div className="stat-sub">Margin: {formatPercent(current.grossMargin)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Operating Expenses</div>
              <div className="stat-value stat-value--red">{formatAmount(current.totalOperatingExpenses)}</div>
              <div className="stat-sub">Previous: {formatAmount(previous.totalOperatingExpenses)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net Profit</div>
              <div className={`stat-value ${current.netProfit >= 0 ? 'stat-value--green-dark' : 'stat-value--red'}`}>{formatSigned(current.netProfit)}</div>
              <div className="stat-sub">Margin: {formatPercent(current.netMargin)}</div>
            </div>
          </div>

          <section className="card">
            <div className="table-scroll">
              <Table aria-label="Profit and loss statement" className="data-table profit-loss-table">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell className="num">{currentLabel}</TableHeaderCell>
                    <TableHeaderCell className="num">{previousLabel}</TableHeaderCell>
                    <TableHeaderCell className="num">Change</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    if (line.kind === 'section') {
                      return (
                        <TableRow key={line.label} className="pl-section">
                          <TableCell colSpan={4}>{line.label}</TableCell>
                        </TableRow>
                      )
                    }
                    if (line.kind === 'subtotal') {
                      return (
                        <TableRow key={line.label} className={`pl-subtotal pl-subtotal--${line.tone} ${line.current < 0 ? 'pl-subtotal--loss' : ''}`}>
                          <TableCell className="pl-subtotal__label">{line.label}</TableCell>
                          <TableCell className="num pl-subtotal__value">{formatSigned(line.current)}</TableCell>
                          <TableCell className="num pl-subtotal__previous">{formatSigned(line.previous)}</TableCell>
                          <TableCell className="num"><ChangeCell change={lineChange(line)} /></TableCell>
                        </TableRow>
                      )
                    }
                    return (
                      <TableRow key={line.label}>
                        <TableCell className={`pl-line__label ${line.muted ? 'pl-line__label--muted' : ''}`}>{line.label}</TableCell>
                        <TableCell className="num">{formatAmount(line.current)}</TableCell>
                        <TableCell className="num text-faint">{formatAmount(line.previous)}</TableCell>
                        <TableCell className="num"><ChangeCell change={lineChange(line)} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          <div className="profit-loss-sources">
            <div className="card">
              <h2>Revenue sources</h2>
              <p>{current.revenue.invoiceCount} posted {current.revenue.invoiceCount === 1 ? 'invoice' : 'invoices'} in {currentLabel}</p>
              <p>Vehicle sales, service revenue and fees from posted invoices</p>
              <p>Interest and other income from posted bank receipts</p>
            </div>
            <div className="card">
              <h2>COGS sources</h2>
              <p>{current.cogs.vehiclesSoldCount} {current.cogs.vehiclesSoldCount === 1 ? 'vehicle' : 'vehicles'} sold in {currentLabel}</p>
              <p>Vehicle Inventory total cost for invoiced vehicles</p>
              <p>Parts COGS remains zero until part-sale lines are recorded</p>
            </div>
            <div className="card">
              <h2>Expense sources</h2>
              <p>Salary, bonuses and commissions from employee records</p>
              <p>Categorized payments and bank charges from posted bank payments</p>
              <p>Inventory, AP settlements, payroll cash and taxes excluded</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
