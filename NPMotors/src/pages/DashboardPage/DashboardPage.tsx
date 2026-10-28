import { ArrowUpRight24Regular, CalendarLtr24Regular, ChevronRight24Regular, MoreHorizontal24Regular } from '@fluentui/react-icons'
import { Link } from 'react-router-dom'
import type { DashboardMetrics, Invoice, Vehicle } from '../../types/npmotors'

const metrics: DashboardMetrics = {
  inventory: 248,
  available: 184,
  sold: 64,
  revenue: 2846500,
  receivable: 128450,
  activeCustomers: 1248,
}

const invoices: Invoice[] = [
  { id: 'INV-1048', customer: 'Olivia Bennett', vehicle: '2024 Toyota RAV4', amount: 38900, date: 'Oct 24, 2024', status: 'Paid' },
  { id: 'INV-1047', customer: 'James Wilson', vehicle: '2023 Ford F-150', amount: 46750, date: 'Oct 23, 2024', status: 'Paid' },
  { id: 'INV-1046', customer: 'Sophia Carter', vehicle: '2024 Honda CR-V', amount: 35400, date: 'Oct 22, 2024', status: 'Pending' },
]

const vehicles: Vehicle[] = [
  { model: 'SUVs', category: 'SUV', count: 92, percentage: 50, color: '#315fbd' },
  { model: 'Sedans', category: 'Sedan', count: 48, percentage: 26, color: '#55b6a7' },
  { model: 'Trucks', category: 'Truck', count: 29, percentage: 16, color: '#efaa55' },
  { model: 'Coupes', category: 'Coupe', count: 15, percentage: 8, color: '#b28ed6' },
]

const recentCustomers = [
  { initials: 'OB', name: 'Olivia Bennett', detail: 'Purchased an SUV', color: 'blue' },
  { initials: 'JW', name: 'James Wilson', detail: 'Purchased a truck', color: 'green' },
  { initials: 'SC', name: 'Sophia Carter', detail: 'New customer', color: 'orange' },
]

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function DashboardPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tuesday, October 29, 2024</p>
          <h1>Good morning, Alex</h1>
          <p className="page-subtitle">Here&apos;s what&apos;s happening at NPMotors today.</p>
        </div>
        <button className="date-control" type="button"><CalendarLtr24Regular /> Oct 1 – Oct 29, 2024</button>
      </header>
      <section className="metric-grid" aria-label="Dealership metrics">
        <MetricCard label="Total inventory" value={metrics.inventory.toString()} trend="+12.5%" icon="▣" tone="blue" />
        <MetricCard label="Available vehicles" value={metrics.available.toString()} trend="+8.2%" icon="◈" tone="green" />
        <MetricCard label="Vehicles sold" value={metrics.sold.toString()} trend="+18.4%" icon="↗" tone="orange" />
        <MetricCard label="Total sales revenue" value={currency.format(metrics.revenue)} trend="+14.6%" icon="$" tone="purple" />
        <MetricCard label="Accounts receivable" value={currency.format(metrics.receivable)} trend="-4.2%" icon="◷" tone="red" negative />
        <MetricCard label="Active customers" value={metrics.activeCustomers.toLocaleString()} trend="+9.8%" icon="♙" tone="teal" />
      </section>
      <section className="content-grid content-grid--wide">
        <article className="panel sales-panel">
          <PanelHeading title="Sales performance" action="Last 7 months" />
          <div className="chart-summary"><strong>$2.85M</strong><span className="positive">+14.6% <small>vs. last period</small></span></div>
          <div className="chart" role="img" aria-label="Sales performance increased from January through October">
            <div className="chart__grid"><span>$500k</span><span>$400k</span><span>$300k</span><span>$200k</span><span>$100k</span><span>$0</span></div>
            <svg viewBox="0 0 640 180" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#315fbd" stopOpacity=".25" /><stop offset="1" stopColor="#315fbd" stopOpacity="0" /></linearGradient></defs><path d="M0 148 C45 150 55 126 100 130 S145 124 180 136 S220 122 260 105 S300 108 340 90 S380 101 420 75 S460 86 500 55 S550 66 590 42 S620 52 640 25 L640 180 L0 180Z" fill="url(#salesFill)" /><path d="M0 148 C45 150 55 126 100 130 S145 124 180 136 S220 122 260 105 S300 108 340 90 S380 101 420 75 S460 86 500 55 S550 66 590 42 S620 52 640 25" fill="none" stroke="#315fbd" strokeWidth="3" /></svg>
            <div className="chart__months"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
          </div>
        </article>
        <article className="panel inventory-panel">
          <PanelHeading title="Inventory overview" action="View inventory" />
          <div className="donut-wrap"><div className="donut"><strong>184</strong><span>Available</span></div><div className="legend">{vehicles.map((vehicle) => <div className="legend__item" key={vehicle.model}><i style={{ backgroundColor: vehicle.color }} /> <span>{vehicle.model}</span><strong>{vehicle.count}</strong></div>)}</div></div>
        </article>
      </section>
      <section className="content-grid content-grid--lower">
        <article className="panel table-panel"><PanelHeading title="Recent sales invoices" action="View all invoices" /><div className="responsive-table"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Vehicle</th><th>Amount</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td className="strong">{invoice.id}<small>{invoice.date}</small></td><td>{invoice.customer}</td><td>{invoice.vehicle}</td><td className="strong">{currency.format(invoice.amount)}</td><td><span className={`status status--${invoice.status.toLowerCase()}`}>{invoice.status}</span></td><td><button className="icon-button" aria-label={`More actions for ${invoice.id}`} type="button"><MoreHorizontal24Regular /></button></td></tr>)}</tbody></table></div></article>
        <article className="panel customers-panel"><PanelHeading title="Recent customers" action="View all" link="/customers" />{recentCustomers.map((customer) => <div className="customer-row" key={customer.name}><div className={`avatar avatar--${customer.color}`}>{customer.initials}</div><div><strong>{customer.name}</strong><span>{customer.detail}</span></div><ArrowUpRight24Regular /></div>)}</article>
      </section>
      <Link className="dashboard-customers-link" to="/customers">Manage customer relationships <ChevronRight24Regular /></Link>
    </div>
  )
}

interface MetricCardProps { label: string; value: string; trend: string; icon: string; tone: string; negative?: boolean }
function MetricCard({ label, value, trend, icon, tone, negative = false }: MetricCardProps) {
  return <article className="metric-card"><div className={`metric-icon metric-icon--${tone}`} aria-hidden="true">{icon}</div><div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className={`metric-trend ${negative ? 'metric-trend--negative' : ''}`}>{trend} <small>vs. last month</small></span></div></article>
}

interface PanelHeadingProps { title: string; action: string; link?: string }
function PanelHeading({ title, action, link }: PanelHeadingProps) {
  return <div className="panel-heading"><h2>{title}</h2>{link ? <Link to={link}>{action} <ChevronRight24Regular /></Link> : <button type="button">{action} <ChevronRight24Regular /></button>}</div>
}
