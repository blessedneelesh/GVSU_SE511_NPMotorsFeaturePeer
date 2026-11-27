import type { DashboardInvoice, MakeCount, MonthlyRevenue } from '../../types/dashboard'
import { percentChange } from '../ProfitLossPage/profitLossMetrics'

export { formatMonth, monthOptions } from '../ProfitLossPage/profitLossMetrics'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const compactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 })

export const formatCurrency = (amount: number) => currency.format(amount)

// "$2.85M", for the chart summary and axis
export const formatCompactCurrency = (amount: number) => compactCurrency.format(amount)

// 'YYYY-MM-DD' as a local date (new Date('2026-11-26') would be UTC midnight, the day before in the Americas)
function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}

// "Nov 26, 2026"
export function formatDate(value: string): string {
  const date = parseDay(value)
  return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
}

// "Thursday, November 26, 2026"
export function formatLongDate(value: string): string {
  const date = parseDay(value)
  return date ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''
}

// "Nov 1 – Nov 26, 2026": the period so far, ending at the as-of date while the month is still running
export function formatPeriod(start: string, end: string, asOf: string): string {
  const from = parseDay(start)
  const periodEnd = parseDay(end)
  const asOfDay = parseDay(asOf)
  if (!from || !periodEnd) return ''
  const to = asOfDay && asOfDay < periodEnd ? asOfDay : periodEnd
  const short = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${short(from)} – ${short(to)}, ${to.getFullYear()}`
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export interface TrendDisplay {
  label: string
  negative: boolean
}

// "+14.6%" / "-4.2%"; null when there is nothing to compare against
export function formatTrend(pct: number | null): TrendDisplay | null {
  if (pct === null || !Number.isFinite(pct)) return null
  return { label: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, negative: pct < 0 }
}

export const countTrend = (current: number, previous: number): TrendDisplay | null => formatTrend(percentChange(current, previous))

// --- Sales performance chart ---

export const CHART_WIDTH = 640
export const CHART_HEIGHT = 180
const CHART_STEPS = 5

export interface RevenueChart {
  // Axis labels from the top value down to $0
  ticks: string[]
  months: string[]
  linePath: string
  areaPath: string
  total: number
  description: string
}

// A round axis top (1, 2, 2.5 or 5 × 10ⁿ per step) at or above the largest value
function niceTop(max: number): number {
  if (max <= 0) return CHART_STEPS * 1000
  const rough = max / CHART_STEPS
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= rough) ?? 10 * magnitude
  return step * CHART_STEPS
}

const shortMonth = (month: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString('en-US', { month: 'short' }) : month
}

export function buildRevenueChart(points: MonthlyRevenue[]): RevenueChart {
  const top = niceTop(Math.max(0, ...points.map((point) => point.revenue)))
  const x = (index: number) => (points.length > 1 ? (index / (points.length - 1)) * CHART_WIDTH : CHART_WIDTH / 2)
  const y = (value: number) => CHART_HEIGHT * (1 - Math.max(0, value) / top)
  const coordinates = points.map((point, index) => `${x(index).toFixed(1)} ${y(point.revenue).toFixed(1)}`)
  const linePath = coordinates.length ? `M${coordinates.join(' L')}` : ''
  const areaPath = coordinates.length
    ? `${linePath} L${x(points.length - 1).toFixed(1)} ${CHART_HEIGHT} L${x(0).toFixed(1)} ${CHART_HEIGHT}Z`
    : ''

  return {
    ticks: Array.from({ length: CHART_STEPS + 1 }, (_, index) => formatCompactCurrency(top - (top / CHART_STEPS) * index)),
    months: points.map((point) => shortMonth(point.month)),
    linePath,
    areaPath,
    total: points.reduce((sum, point) => sum + point.revenue, 0),
    description: points.length
      ? `Monthly revenue: ${points.map((point) => `${shortMonth(point.month)} ${formatCurrency(point.revenue)}`).join(', ')}`
      : 'No monthly revenue yet',
  }
}

// --- Inventory overview donut ---

const SLICE_COLORS = ['#315fbd', '#55b6a7', '#efaa55', '#b28ed6']
const EMPTY_DONUT = '#e8edf5'

export interface InventorySlice {
  label: string
  count: number
  color: string
}

// The three largest makes plus "Other" when there are more than four, so the legend stays within the design's four rows
export function buildInventorySlices(makes: MakeCount[]): InventorySlice[] {
  const sorted = makes.filter((make) => make.count > 0).sort((a, b) => b.count - a.count)
  const shown = sorted.length > SLICE_COLORS.length ? sorted.slice(0, SLICE_COLORS.length - 1) : sorted
  const rest = sorted.slice(shown.length).reduce((sum, make) => sum + make.count, 0)
  const slices = shown.map((make, index) => ({ label: make.make || 'Unknown', count: make.count, color: SLICE_COLORS[index] ?? EMPTY_DONUT }))
  return rest > 0 ? [...slices, { label: 'Other', count: rest, color: SLICE_COLORS[SLICE_COLORS.length - 1] ?? EMPTY_DONUT }] : slices
}

export function donutGradient(slices: InventorySlice[]): string {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  if (total === 0) return EMPTY_DONUT
  let start = 0
  const stops = slices.map((slice) => {
    const end = start + (slice.count / total) * 100
    const stop = `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`
    start = end
    return stop
  })
  return `conic-gradient(${stops.join(', ')})`
}

// --- Recent sales invoices and customers ---

export interface StatusBadge {
  label: string
  className: string
}

export function invoiceStatus(invoice: DashboardInvoice): StatusBadge {
  if (invoice.lifecycle === 'draft') return { label: 'Draft', className: 'status--draft' }
  if (invoice.lifecycle === 'cancelled') return { label: 'Cancelled', className: 'status--cancelled' }
  if (invoice.paymentStatus === 'paid') return { label: 'Paid', className: 'status--paid' }
  if (invoice.paymentStatus === 'partial') return { label: 'Partial', className: 'status--partial' }
  return { label: 'Unpaid', className: 'status--unpaid' }
}

export const vehicleName = (invoice: DashboardInvoice) => [invoice.make, invoice.model].filter(Boolean).join(' ')

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}` : (parts[0] ?? '').slice(0, 2)
  return letters.toUpperCase() || '?'
}

const AVATAR_COLORS = ['blue', 'green', 'orange'] as const

export interface RecentCustomer {
  key: string
  name: string
  initials: string
  detail: string
  color: (typeof AVATAR_COLORS)[number]
}

// The API has no recent-customers list; take the customers of the recent invoices (newest first), once each
export function recentCustomers(invoices: DashboardInvoice[], limit = 4): RecentCustomer[] {
  const seen = new Set<string>()
  const customers: RecentCustomer[] = []
  for (const invoice of invoices) {
    const key = invoice.customerId || invoice.customerName
    if (!key || seen.has(key)) continue
    seen.add(key)
    const vehicle = vehicleName(invoice)
    const name = invoice.customerName || 'Unknown customer'
    customers.push({
      key,
      name,
      initials: initials(name),
      detail: vehicle ? `Purchased a ${vehicle}` : 'Recent sales invoice',
      color: AVATAR_COLORS[customers.length % AVATAR_COLORS.length] ?? 'blue',
    })
    if (customers.length === limit) break
  }
  return customers
}
