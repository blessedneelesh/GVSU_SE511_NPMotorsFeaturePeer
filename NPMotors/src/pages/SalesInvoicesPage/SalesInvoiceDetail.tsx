import { useCallback, useEffect, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TabList,
  TableRow,
} from '@fluentui/react-components'
import {
  DataTrending20Regular,
  DocumentText20Regular,
  Mail20Regular,
  MoneyHand20Regular,
  Person20Regular,
  Print20Regular,
  VehicleCarProfileLtr20Regular,
} from '@fluentui/react-icons'
import { useCustomerDetail } from '../../hooks/useCustomerDetail'
import { useSalesInvoiceDetail } from '../../hooks/useSalesInvoiceDetail'
import { useSalesInvoiceMutations } from '../../hooks/useSalesInvoiceMutations'
import { useSalesInvoiceOptions } from '../../hooks/useSalesInvoiceOptions'
import { useReceiptMutations } from '../../hooks/useReceiptMutations'
import { useReceiptPaymentHistory } from '../../hooks/useReceiptPaymentHistory'
import { useVehicleDetail } from '../../hooks/useVehicleDetail'
import type { Customer } from '../../types/customers'
import type { ReceiptPayment, ReceiptTarget } from '../../types/receipts'
import type { ReceivableAgingStatus } from '../../types/receivables'
import type { SalesInvoice } from '../../types/salesInvoices'
import type { Vehicle } from '../../types/vehicles'
import { paymentMethodLabel, sortPaymentsOldestFirst } from '../AccountsReceivablePage/receivableMetrics'
import { ReceivePaymentDialog } from '../AccountsReceivablePage/ReceivePaymentDialog'
import '../AccountsReceivablePage/ReceivePaymentDialog.css'
import { CancelSalesInvoiceDialog } from './CancelSalesInvoiceDialog'
import { canCancel, formatAmount, statusBadges, statusTitle, TAX_RATE } from './salesInvoiceMetrics'

const CANCELLED_BANNER_MS = 4000

// Posted invoices with money still owed can take a payment
// Payments are posted against the invoice's AR record, so there must be one
const canReceivePayment = (invoice: SalesInvoice) => invoice.lifecycle === 'posted' && invoice.balance > 0 && invoice.arInvoiceId !== ''

const AGING_STATUS = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' } as const satisfies Record<string, ReceivableAgingStatus>

// The payment form posts to the AR invoice, but is checked against, and shown with, the sales invoice's own figures
const toReceiptTarget = (invoice: SalesInvoice): ReceiptTarget => ({
  id: invoice.arInvoiceId,
  number: invoice.number,
  customerName: invoice.customerName,
  amount: invoice.total,
  paid: invoice.paid,
  balance: invoice.balance,
  agingStatus: AGING_STATUS[invoice.paymentStatus ?? 'unpaid'],
})

// "Send to Customer" opens the user's mail app with the invoice's summary, addressed to the customer
function invoiceMailto(invoice: SalesInvoice, email: string): string {
  const subject = `Sales Invoice ${invoice.number}`
  const body = [
    `Invoice: ${invoice.number}`,
    `Vehicle: ${invoice.vehicle || '—'} (VIN ${invoice.vin || '—'})`,
    `Total: ${formatAmount(invoice.total)}`,
    `Balance due: ${formatAmount(invoice.balance)}${invoice.dueDate ? ` by ${invoice.dueDate}` : ''}`,
  ].join('\n')
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Loads the selected invoice from GetSalesInvoiceById via Redux; the list page decides when it's shown
export function SalesInvoiceDetail() {
  const navigate = useNavigate()
  const { salesInvoice, vehicle, detailStatus, detailError, closeSalesInvoice, retry } = useSalesInvoiceDetail()
  const { salespersonName, findCustomer } = useSalesInvoiceOptions()
  const { cancelStatus, resetCancel } = useSalesInvoiceMutations()
  const { openCustomer } = useCustomerDetail()
  const { openVehicle } = useVehicleDetail()
  const [isCancelOpen, setCancelOpen] = useState(false)
  const { resetSave: resetReceiptSave } = useReceiptMutations()
  // The invoice the payment dialog is open for. Kept here, not in the profile: a posted payment reloads the
  // invoice, which unmounts the profile while it loads.
  const [receiving, setReceiving] = useState<SalesInvoice | null>(null)

  const openCancel = () => {
    resetCancel()
    setCancelOpen(true)
  }
  const closeCancel = useCallback(() => {
    resetCancel()
    setCancelOpen(false)
  }, [resetCancel])

  // A successful cancel swaps the dialog for a banner; the saga reloads the invoice so the status updates too
  const isCancelled = isCancelOpen && cancelStatus === 'success'
  useEffect(() => {
    if (!isCancelled) return
    const timer = window.setTimeout(closeCancel, CANCELLED_BANNER_MS)
    return () => window.clearTimeout(timer)
  }, [isCancelled, closeCancel])

  const isLoaded = detailStatus === 'success' && salesInvoice
  const customer = salesInvoice ? findCustomer(salesInvoice.customerId) : undefined
  const receivePayment = () => {
    if (!salesInvoice) return
    resetReceiptSave()
    setReceiving(salesInvoice)
  }
  const closeReceive = () => {
    resetReceiptSave()
    setReceiving(null)
  }

  // Related Records: the customer and vehicle pages open straight into the record's detail view
  const related: RelatedLinks = {
    openCustomer: (id) => { openCustomer(id); navigate('/customers') },
    openVehicle: (id) => { openVehicle(id); navigate('/vehicle-inventory') },
    openTransactions: () => navigate('/transactions'),
    openProfitability: () => navigate('/vehicle-profitability'),
  }

  return (
    <div className="sales-invoices-page">
      <div className="sales-invoice-detail__bar">
        <nav className="sales-invoices-breadcrumb" aria-label="Breadcrumb">
          <button type="button" className="link-button" onClick={closeSalesInvoice}>← Sales Invoices</button>
          <span aria-hidden="true">/</span>
          <strong>{salesInvoice?.number || 'Sales Invoice'}</strong>
        </nav>
        {isLoaded && (
          <div className="sales-invoice-detail__commands" role="toolbar" aria-label="Invoice actions">
            {canReceivePayment(salesInvoice) && (
              <Button appearance="primary" icon={<MoneyHand20Regular />} onClick={receivePayment}>Receive Payment</Button>
            )}
            <Button icon={<Print20Regular />} onClick={() => window.print()}>Print</Button>
            {customer?.email ? (
              <Button as="a" icon={<Mail20Regular />} href={invoiceMailto(salesInvoice, customer.email)}>Send to Customer</Button>
            ) : (
              <Button icon={<Mail20Regular />} disabled title="The customer has no email address">Send to Customer</Button>
            )}
            {canCancel(salesInvoice) && (
              <Button className="danger-button" onClick={openCancel}>Cancel Invoice</Button>
            )}
          </div>
        )}
      </div>

      {isCancelled && (
        <MessageBar intent="success" className="sales-invoices-message">
          <MessageBarBody>Invoice cancelled. The vehicle is available again.</MessageBarBody>
          <MessageBarActions>
            <Button appearance="transparent" size="small" onClick={closeCancel}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="sales-invoices-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load sales invoice</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card sales-invoices-loading">
          <Spinner label="Loading sales invoice…" />
        </section>
      )}

      {isLoaded && (
        <SalesInvoiceProfile
          invoice={salesInvoice}
          customer={customer}
          vehicle={vehicle}
          salesperson={salespersonName(salesInvoice.salespersonId)}
          onReceivePayment={receivePayment}
          related={related}
        />
      )}

      {isCancelOpen && !isCancelled && salesInvoice && <CancelSalesInvoiceDialog invoice={salesInvoice} onClose={closeCancel} />}
      {receiving && <ReceivePaymentDialog invoice={toReceiptTarget(receiving)} onClose={closeReceive} />}
    </div>
  )
}

const BANNER_TONES = { draft: 'slate', cancelled: 'slate', paid: 'green', partial: 'blue', unpaid: 'amber' } as const
const BANNER_ICONS = { draft: '✎', cancelled: '×', paid: '✓', partial: '↻', unpaid: '○' } as const

function StatusBanner({ invoice }: { invoice: SalesInvoice }) {
  const key = invoice.lifecycle === 'posted' ? invoice.paymentStatus ?? 'unpaid' : invoice.lifecycle
  const progress = invoice.total > 0 ? Math.min(100, (invoice.paid / invoice.total) * 100) : 0
  const showProgress = invoice.lifecycle === 'posted' && key !== 'paid'

  const subtitle =
    invoice.lifecycle === 'cancelled' ? invoice.cancelReason || 'This invoice has been cancelled'
      : invoice.lifecycle === 'draft' ? 'Not posted yet, so no accounting entries have been created'
        : key === 'paid' ? 'Fully paid'
          : key === 'partial' ? `${formatAmount(invoice.paid)} received · ${formatAmount(invoice.balance)} outstanding`
            : `Due ${invoice.dueDate || '—'} · ${formatAmount(invoice.balance)} outstanding`

  return (
    <div className={`status-banner status-banner--${BANNER_TONES[key]}`}>
      <div className="status-banner__main">
        <span className="status-banner__icon" aria-hidden="true">{BANNER_ICONS[key]}</span>
        <div>
          <div className="status-banner__title">{statusTitle(invoice)}</div>
          <div className="status-banner__subtitle">{subtitle}</div>
        </div>
      </div>
      {showProgress && (
        <div className="status-banner__progress">
          <div>Payment progress</div>
          <div className="progress-track" role="progressbar" aria-label="Payment progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div>{progress.toFixed(0)}% collected</div>
        </div>
      )}
    </div>
  )
}

interface RelatedLinks {
  openCustomer: (id: string) => void
  openVehicle: (id: string) => void
  openTransactions: () => void
  openProfitability: () => void
}

interface SalesInvoiceProfileProps {
  invoice: SalesInvoice
  // Undefined until the customers load, or when the customer is no longer returned; the invoice's name is shown then
  customer: Customer | undefined
  // Null until the vehicle record loads, or when it can't be; the invoice's make, model and VIN are shown then
  vehicle: Vehicle | null
  salesperson: string
  onReceivePayment: () => void
  related: RelatedLinks
}

function SalesInvoiceProfile({ invoice, customer, vehicle, salesperson, onReceivePayment, related }: SalesInvoiceProfileProps) {
  const grossProfit = invoice.salePrice - invoice.vehicleTotalCost
  const margin = invoice.salePrice > 0 ? ((grossProfit / invoice.salePrice) * 100).toFixed(1) : '0.0'
  const subtotal = invoice.salePrice - invoice.discount + invoice.fees
  const location = customer && [customer.city, [customer.state, customer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <>
      <StatusBanner invoice={invoice} />

      <div className="sales-invoice-detail">
        <div className="sales-invoice-detail__main">
          <section className="card invoice-card">
            <header className="invoice-card__header">
              <div>
                <div className="invoice-card__eyebrow">Sales Invoice</div>
                <div className="invoice-card__number">{invoice.number || '—'}</div>
              </div>
              <div className="invoice-card__company">NPMotors</div>
            </header>

            <div className="invoice-card__body">
              <div className="invoice-card__parties">
                <div>
                  <h4>Bill To</h4>
                  <div className="strong">{customer?.fullName || invoice.customerName || '—'}</div>
                  {customer?.address && <div className="text-secondary">{customer.address}</div>}
                  {location && <div className="text-secondary">{location}</div>}
                  {customer?.phone && <div className="text-secondary">{customer.phone}</div>}
                  {customer?.email && <div className="text-link">{customer.email}</div>}
                </div>
                <div>
                  <h4>Vehicle</h4>
                  <div className="strong">{vehicle?.title || invoice.vehicle || '—'}</div>
                  <div className="text-muted">
                    <span className="text-secondary">VIN:</span> <span className="mono text-xs">{invoice.vin || '—'}</span>
                  </div>
                  {vehicle?.color && <div className="text-muted">Color: {vehicle.color}</div>}
                </div>
                <div>
                  <h4>Invoice Details</h4>
                  <dl className="summary-list">
                    <div><dt>Invoice Date</dt><dd>{invoice.invoiceDate || '—'}</dd></div>
                    <div><dt>Due Date</dt><dd className={invoice.balance > 0 && invoice.lifecycle === 'posted' ? 'text-amber' : ''}>{invoice.dueDate || '—'}</dd></div>
                    <div><dt>Salesperson</dt><dd>{salesperson || '—'}</dd></div>
                    <div>
                      <dt>Status</dt>
                      <dd className="badge-group">
                        {statusBadges(invoice).map((badge) => <span key={badge.label} className={`badge ${badge.className}`}>{badge.label}</span>)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="table-scroll">
                <Table aria-label={`Line items for ${invoice.number}`} className="data-table line-items-table">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Description</TableHeaderCell>
                      <TableHeaderCell className="num">Qty</TableHeaderCell>
                      <TableHeaderCell className="num">Unit Price</TableHeaderCell>
                      <TableHeaderCell className="num">Amount</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="strong">{invoice.vehicle || 'Vehicle'}</div>
                        <div className="mono text-xs text-faint">VIN: {invoice.vin || '—'}</div>
                      </TableCell>
                      <TableCell className="num">1</TableCell>
                      <TableCell className="num">{formatAmount(invoice.salePrice)}</TableCell>
                      <TableCell className="num strong">{formatAmount(invoice.salePrice)}</TableCell>
                    </TableRow>
                    {invoice.discount > 0 && (
                      <TableRow>
                        <TableCell className="text-muted italic">Negotiated Discount</TableCell>
                        <TableCell className="num">—</TableCell>
                        <TableCell className="num">—</TableCell>
                        <TableCell className="num text-red">-{formatAmount(invoice.discount)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="text-muted">Document &amp; Processing Fees</TableCell>
                      <TableCell className="num">—</TableCell>
                      <TableCell className="num">—</TableCell>
                      <TableCell className="num">{formatAmount(invoice.fees)}</TableCell>
                    </TableRow>
                    <TableRow className="line-items__total-row">
                      <TableCell colSpan={3} className="num text-muted">Subtotal</TableCell>
                      <TableCell className="num">{formatAmount(subtotal)}</TableCell>
                    </TableRow>
                    <TableRow className="line-items__total-row">
                      <TableCell colSpan={3} className="num text-muted">Sales Tax ({TAX_RATE * 100}%)</TableCell>
                      <TableCell className="num">{formatAmount(invoice.tax)}</TableCell>
                    </TableRow>
                    <TableRow className="line-items__total-row line-items__grand-total">
                      <TableCell colSpan={3} className="num">TOTAL DUE</TableCell>
                      <TableCell className="num text-blue">{formatAmount(invoice.total)}</TableCell>
                    </TableRow>
                    {invoice.paid > 0 && (
                      <>
                        <TableRow className="line-items__total-row">
                          <TableCell colSpan={3} className="num text-muted">Amount Paid</TableCell>
                          <TableCell className="num strong text-green">-{formatAmount(invoice.paid)}</TableCell>
                        </TableRow>
                        <TableRow className="line-items__total-row line-items__balance">
                          <TableCell colSpan={3} className="num">BALANCE DUE</TableCell>
                          <TableCell className="num text-amber">{formatAmount(invoice.balance)}</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>

          <InvoiceTabs invoice={invoice} customer={customer} vehicle={vehicle} onReceivePayment={onReceivePayment} />
        </div>

        <aside className="sales-invoice-detail__aside">
          <section className="card summary-card">
            <h3>Amount Summary</h3>
            <dl className="summary-list">
              <div><dt>Sale Price</dt><dd>{formatAmount(invoice.salePrice)}</dd></div>
              {invoice.discount > 0 && <div><dt>Discount</dt><dd className="text-red">-{formatAmount(invoice.discount)}</dd></div>}
              <div><dt>Fees</dt><dd>{formatAmount(invoice.fees)}</dd></div>
              <div><dt>Tax</dt><dd>{formatAmount(invoice.tax)}</dd></div>
              <div className="summary-list__total"><dt>Total</dt><dd className="text-blue">{formatAmount(invoice.total)}</dd></div>
              {invoice.lifecycle !== 'draft' && <div><dt>Paid</dt><dd className="strong text-green">{formatAmount(invoice.paid)}</dd></div>}
              {invoice.lifecycle === 'posted' && invoice.balance > 0 && (
                <div className="summary-list__balance"><dt>Balance Due</dt><dd>{formatAmount(invoice.balance)}</dd></div>
              )}
            </dl>
          </section>

          <section className="card summary-card summary-card--green">
            <h3>Gross Profitability</h3>
            <dl className="summary-list">
              <div><dt>Sale Price</dt><dd>{formatAmount(invoice.salePrice)}</dd></div>
              <div><dt>Vehicle Cost</dt><dd className="text-red">-{formatAmount(invoice.vehicleTotalCost)}</dd></div>
              <div className="summary-list__rule summary-list__strong">
                <dt>Gross Profit</dt>
                <dd className={grossProfit >= 0 ? 'text-green' : 'text-red'}>{formatAmount(grossProfit)}</dd>
              </div>
              <div className="summary-list__small">
                <dt>Margin</dt>
                <dd className={grossProfit >= 0 ? 'text-green strong' : 'text-red'}>{margin}%</dd>
              </div>
            </dl>
          </section>

          <section className="card summary-card">
            <h3>Related Records</h3>
            <ul className="related-records">
              <RelatedRecord
                icon={<Person20Regular />}
                label="Customer Profile"
                sub={customer?.fullName || invoice.customerName || '—'}
                onClick={invoice.customerId ? () => related.openCustomer(invoice.customerId) : undefined}
              />
              <RelatedRecord
                icon={<VehicleCarProfileLtr20Regular />}
                label="Vehicle Record"
                sub={vehicle?.title || invoice.vehicle || '—'}
                onClick={invoice.vehicleId ? () => related.openVehicle(invoice.vehicleId) : undefined}
              />
              {invoice.lifecycle !== 'draft' && (
                <RelatedRecord icon={<DocumentText20Regular />} label="GL Entries" sub="Posted transactions" onClick={related.openTransactions} />
              )}
              <RelatedRecord icon={<DataTrending20Regular />} label="Vehicle Profitability" sub={`Margin ${margin}%`} onClick={related.openProfitability} />
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}

interface RelatedRecordProps {
  icon: ReactElement
  label: string
  sub: string
  // Undefined when the invoice has no id to open the record by
  onClick: (() => void) | undefined
}

function RelatedRecord({ icon, label, sub, onClick }: RelatedRecordProps) {
  return (
    <li>
      <button type="button" className="related-record" disabled={!onClick} onClick={onClick}>
        <span className="related-record__icon" aria-hidden="true">{icon}</span>
        <span>
          <span className="related-record__label">{label}</span>
          <span className="related-record__sub">{sub}</span>
        </span>
      </button>
    </li>
  )
}

type InvoiceTab = 'details' | 'payments'
const isInvoiceTab = (value: unknown): value is InvoiceTab => value === 'details' || value === 'payments'

interface InvoiceTabsProps {
  invoice: SalesInvoice
  customer: Customer | undefined
  vehicle: Vehicle | null
  onReceivePayment: () => void
}

// The design's "Vehicle Details" / "Payment History" card under the invoice
function InvoiceTabs({ invoice, customer, vehicle, onReceivePayment }: InvoiceTabsProps) {
  const [tab, setTab] = useState<InvoiceTab>('details')

  return (
    <section className="card invoice-tabs">
      <TabList
        className="invoice-tabs__list"
        selectedValue={tab}
        onTabSelect={(_, data) => { if (isInvoiceTab(data.value)) setTab(data.value) }}
      >
        <Tab value="details">Vehicle Details</Tab>
        <Tab value="payments">Payment History</Tab>
      </TabList>

      <div className="invoice-tabs__panel" role="tabpanel" aria-label={tab === 'details' ? 'Vehicle Details' : 'Payment History'}>
        {tab === 'details'
          ? <VehicleDetailsPanel invoice={invoice} customer={customer} vehicle={vehicle} />
          : <PaymentHistoryPanel invoice={invoice} onReceivePayment={onReceivePayment} />}
      </div>
    </section>
  )
}

function VehicleDetailsPanel({ invoice, customer, vehicle }: Omit<InvoiceTabsProps, 'onReceivePayment'>) {
  const vehicleRows: [string, string][] = [
    ['Make', vehicle?.make || invoice.make],
    ['Model', vehicle?.model || invoice.model],
    ['Year', vehicle?.year ? String(vehicle.year) : ''],
    ['Color', vehicle?.color ?? ''],
    ['VIN', vehicle?.vin || invoice.vin],
    ['Warehouse', vehicle?.warehouse ?? ''],
  ]
  const customerRows: [string, string][] = [
    ['Name', customer?.fullName || invoice.customerName],
    ['Phone', customer?.phone ?? ''],
    ['Email', customer?.email ?? ''],
    ['Address', [customer?.address, customer?.city].filter(Boolean).join(', ')],
    ['Customer ID', invoice.customerId],
  ]

  return (
    <div className="detail-columns">
      <div>
        <h4>Vehicle Information</h4>
        <dl className="detail-list">
          {vehicleRows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd className={label === 'VIN' ? 'mono text-xs' : undefined}>{value || '—'}</dd></div>
          ))}
        </dl>
      </div>
      <div>
        <h4>Customer</h4>
        <dl className="detail-list">
          {customerRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
        </dl>
      </div>
    </div>
  )
}

// Receipts from GetPaymentHistory of the invoice's AR record, newest first. Only invoices with money paid are looked
// up; when there are no receipts (no AR record, or the payment was taken with the invoice), the design's fallback
// shows the amount paid as one row.
function PaymentHistoryPanel({ invoice, onReceivePayment }: { invoice: SalesInvoice; onReceivePayment: () => void }) {
  const hasPaid = invoice.paid > 0
  const arInvoiceId = hasPaid && invoice.arInvoiceId ? invoice.arInvoiceId : null
  const { payments, paymentHistoryStatus: paymentsStatus, paymentHistoryError: paymentsError, retry } = useReceiptPaymentHistory(arInvoiceId)
  const newestFirst = sortPaymentsOldestFirst(payments).reverse()

  if (!hasPaid) {
    return (
      <div className="payment-history__empty">
        <MoneyHand20Regular aria-hidden="true" />
        <div>No payments received yet</div>
        {canReceivePayment(invoice) && <Button appearance="primary" onClick={onReceivePayment}>Receive Payment</Button>}
      </div>
    )
  }

  if (paymentsStatus === 'error') {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          <MessageBarTitle>Couldn&apos;t load payments</MessageBarTitle>
          {paymentsError}
        </MessageBarBody>
        <MessageBarActions>
          <Button onClick={retry}>Retry</Button>
        </MessageBarActions>
      </MessageBar>
    )
  }

  if (arInvoiceId && paymentsStatus !== 'success' && newestFirst.length === 0) {
    return (
      <div className="payment-history__empty">
        <Spinner size="small" label="Loading payments…" />
      </div>
    )
  }

  return (
    <>
      <div className={`table-scroll${paymentsStatus === 'loading' ? ' is-refreshing' : ''}`}>
        <Table aria-label={`Payments for ${invoice.number}`} aria-busy={paymentsStatus === 'loading'} className="data-table payment-history-table">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Method</TableHeaderCell>
              <TableHeaderCell>Reference</TableHeaderCell>
              <TableHeaderCell className="num">Amount</TableHeaderCell>
              <TableHeaderCell>Note</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newestFirst.length > 0 ? newestFirst.map((payment, index) => (
              <TableRow key={payment.id || `${payment.receiptNumber}-${index}`}>
                <TableCell className="text-secondary">{payment.receiptDate || '—'}</TableCell>
                <TableCell><span className="method-chip">{paymentMethodLabel(payment.paymentMethod)}</span></TableCell>
                <TableCell className="mono text-xs text-link">{payment.receiptNumber || '—'}</TableCell>
                <TableCell className="num strong text-green">{formatAmount(payment.amount)}</TableCell>
                <TableCell className="text-xs text-muted">{paymentNote(payment)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell className="text-secondary">{invoice.invoiceDate || '—'}</TableCell>
                <TableCell><span className="method-chip">Recorded payment</span></TableCell>
                <TableCell className="mono text-xs">—</TableCell>
                <TableCell className="num strong text-green">{formatAmount(invoice.paid)}</TableCell>
                <TableCell className="text-xs text-muted">Payment recorded with invoice</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <dl className="summary-list payment-history__totals">
        <div><dt>Total Paid</dt><dd className="strong text-green">{formatAmount(invoice.paid)}</dd></div>
        {invoice.balance > 0 && <div className="summary-list__strong"><dt className="text-amber">Balance Remaining</dt><dd className="text-amber">{formatAmount(invoice.balance)}</dd></div>}
      </dl>
    </>
  )
}

// The design's Note: where the money went, and the payer's reference when there is one
const paymentNote = (payment: ReceiptPayment) =>
  [payment.bankAccountName && `Deposited to ${payment.bankAccountName}`, payment.reference].filter(Boolean).join(' · ') || '—'
