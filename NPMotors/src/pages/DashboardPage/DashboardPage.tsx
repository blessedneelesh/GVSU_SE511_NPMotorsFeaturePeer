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
import { ArrowUpRight24Regular, ChevronRight24Regular } from '@fluentui/react-icons'
import { Link } from 'react-router-dom'
import { useDashboard } from '../../hooks/useDashboard'
import type { DashboardSummary } from '../../types/dashboard'
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  buildInventorySlices,
  buildRevenueChart,
  countTrend,
  donutGradient,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatLongDate,
  formatMonth,
  formatPeriod,
  formatTrend,
  greeting,
  invoiceStatus,
  monthOptions,
  recentCustomers,
  vehicleName,
  type TrendDisplay,
} from './dashboardMetrics'
import './DashboardPage.css'

const todayValue = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export function DashboardPage() {
  const { summary, query, status, error, setMonth, retry } = useDashboard()
  const months = useMemo(() => monthOptions(), [])

  const isLoading = status === 'loading'
  const isInitialLoad = (isLoading || status === 'idle') && summary === null
  const showSummary = summary !== null && status !== 'error'
  const monthLabel = months.find((option) => option.value === query.month)?.label ?? formatMonth(query.month)

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{formatLongDate(summary?.asOfDate || todayValue())}</p>
          <h1>{greeting()}</h1>
          <p className="page-subtitle">
            Here&apos;s what&apos;s happening at NPMotors
            {summary ? ` · ${formatPeriod(summary.periodStart, summary.periodEnd, summary.asOfDate)}` : ''}
          </p>
        </div>
        <Dropdown
          className="dashboard-month"
          aria-label="Month"
          value={monthLabel}
          selectedOptions={[query.month]}
          onOptionSelect={(_, data) => { if (data.optionValue) setMonth(data.optionValue) }}
        >
          {months.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
      </header>

      {status === 'error' && (
        <MessageBar intent="error" className="dashboard-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load the dashboard</MessageBarTitle>
            {error}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="panel dashboard-loading">
          <Spinner label="Loading dashboard…" />
        </section>
      )}

      {showSummary && (
        <div className={isLoading ? 'is-refreshing' : ''} aria-busy={isLoading}>
          <DashboardContent summary={summary} />
        </div>
      )}
    </div>
  )
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  const chart = useMemo(() => buildRevenueChart(summary.monthlyRevenue), [summary.monthlyRevenue])
  const slices = useMemo(() => buildInventorySlices(summary.availableByMake), [summary.availableByMake])
  const customers = useMemo(() => recentCustomers(summary.recentInvoices), [summary.recentInvoices])

  const availablePct = summary.totalInventory > 0 ? Math.round((summary.availableVehicles / summary.totalInventory) * 100) : 0
  const makeCount = summary.availableByMake.filter((make) => make.count > 0).length
  const soldTrend = countTrend(summary.vehiclesSold, summary.vehiclesSoldPrevious)
  const revenueTrend = formatTrend(summary.revenueChangePct)

  return (
    <>
      <section className="metric-grid" aria-label="Dealership metrics">
        <MetricCard label="Total inventory" value={summary.totalInventory.toLocaleString()} icon="▣" tone="blue" note={`${availablePct}% available`} />
        <MetricCard label="Available vehicles" value={summary.availableVehicles.toLocaleString()} icon="◈" tone="green" note={`${makeCount} ${makeCount === 1 ? 'make' : 'makes'}`} />
        <MetricCard label="Vehicles sold" value={summary.vehiclesSold.toLocaleString()} icon="↗" tone="orange" trend={soldTrend} note={`Last month: ${summary.vehiclesSoldPrevious.toLocaleString()}`} />
        <MetricCard label="Total sales revenue" value={formatCurrency(summary.revenue)} icon="$" tone="purple" trend={revenueTrend} note={`Last month: ${formatCurrency(summary.revenuePrevious)}`} />
        <MetricCard label="Accounts receivable" value={formatCurrency(summary.receivableBalance)} icon="◷" tone="red" note={`${summary.openReceivables} open ${summary.openReceivables === 1 ? 'invoice' : 'invoices'}`} />
        <MetricCard label="Active customers" value={summary.activeCustomers.toLocaleString()} icon="♙" tone="teal" note="Active accounts" />
      </section>

      <section className="content-grid content-grid--wide">
        <article className="panel sales-panel">
          <PanelHeading title="Sales performance" note={`Last ${summary.monthlyRevenue.length} months`} />
          <div className="chart-summary">
            <strong>{formatCompactCurrency(chart.total)}</strong>
            <span className="dashboard-chart-caption">total revenue</span>
          </div>
          <div className="chart" role="img" aria-label={chart.description}>
            <div className="chart__grid">{chart.ticks.map((tick, index) => <span key={`${tick}-${index}`}>{tick}</span>)}</div>
            <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#315fbd" stopOpacity=".25" />
                  <stop offset="1" stopColor="#315fbd" stopOpacity="0" />
                </linearGradient>
              </defs>
              {chart.areaPath && <path d={chart.areaPath} fill="url(#salesFill)" />}
              {chart.linePath && <path d={chart.linePath} fill="none" stroke="#315fbd" strokeWidth="3" vectorEffect="non-scaling-stroke" />}
            </svg>
            <div className="chart__months">{chart.months.map((month, index) => <span key={`${month}-${index}`}>{month}</span>)}</div>
          </div>
        </article>

        <article className="panel inventory-panel">
          <PanelHeading title="Inventory overview" action="View inventory" link="/vehicle-inventory" />
          <div className="donut-wrap">
            <div className="donut" style={{ background: donutGradient(slices) }}>
              <strong>{summary.availableVehicles}</strong>
              <span>Available</span>
            </div>
            <div className="legend">
              {slices.length === 0
                ? <p className="dashboard-empty">No available vehicles.</p>
                : slices.map((slice) => (
                  <div className="legend__item" key={slice.label}>
                    <i style={{ backgroundColor: slice.color }} /> <span>{slice.label}</span><strong>{slice.count}</strong>
                  </div>
                ))}
            </div>
          </div>
        </article>
      </section>

      <section className="content-grid content-grid--lower">
        <article className="panel table-panel">
          <PanelHeading title="Recent sales invoices" action="View all invoices" link="/sales-invoices" />
          <div className="table-scroll">
            <Table aria-label="Recent sales invoices" className="data-table dashboard-invoices-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Invoice</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Vehicle</TableHeaderCell>
                  <TableHeaderCell className="num">Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentInvoices.map((invoice, index) => {
                  const badge = invoiceStatus(invoice)
                  return (
                    <TableRow key={invoice.id || `${invoice.number}-${index}`}>
                      <TableCell>
                        <div className="strong">{invoice.number || '—'}<small>{formatDate(invoice.invoiceDate) || '—'}</small></div>
                      </TableCell>
                      <TableCell>{invoice.customerName || '—'}</TableCell>
                      <TableCell>{vehicleName(invoice) || '—'}</TableCell>
                      <TableCell className="num strong">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell><span className={`status ${badge.className}`}>{badge.label}</span></TableCell>
                    </TableRow>
                  )
                })}
                {summary.recentInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="table-empty">No sales invoices yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </article>

        <article className="panel customers-panel">
          <PanelHeading title="Recent customers" action="View all" link="/customers" />
          {customers.length === 0 && <p className="dashboard-empty">No recent customers.</p>}
          {customers.map((customer) => (
            <div className="customer-row" key={customer.key}>
              <div className={`avatar avatar--${customer.color}`}>{customer.initials}</div>
              <div><strong>{customer.name}</strong><span>{customer.detail}</span></div>
              <ArrowUpRight24Regular />
            </div>
          ))}
        </article>
      </section>

      <Link className="dashboard-customers-link" to="/customers">Manage customer relationships <ChevronRight24Regular /></Link>
    </>
  )
}

interface MetricCardProps {
  label: string
  value: string
  icon: string
  tone: string
  // Shown when there is no trend (or nothing to compare against)
  note: string
  trend?: TrendDisplay | null
}

function MetricCard({ label, value, icon, tone, note, trend }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-icon--${tone}`} aria-hidden="true">{icon}</div>
      <div>
        <span className="metric-label">{label}</span>
        <strong className="metric-value">{value}</strong>
        {trend
          ? <span className={`metric-trend ${trend.negative ? 'metric-trend--negative' : ''}`}>{trend.label} <small>vs. last month</small></span>
          : <span className="metric-note">{note}</span>}
      </div>
    </article>
  )
}

interface PanelHeadingProps {
  title: string
  // A link to the full list, or a plain note such as the chart's range
  action?: string
  link?: string
  note?: string
}

function PanelHeading({ title, action, link, note }: PanelHeadingProps) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      {link && action && <Link to={link}>{action} <ChevronRight24Regular /></Link>}
      {note && <span className="panel-heading__note">{note}</span>}
    </div>
  )
}
