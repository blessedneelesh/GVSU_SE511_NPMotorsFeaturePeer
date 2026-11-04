import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components'
import { useSalesInvoiceDetail } from '../../hooks/useSalesInvoiceDetail'
import { useSalesInvoiceMutations } from '../../hooks/useSalesInvoiceMutations'
import { useSalesInvoiceOptions } from '../../hooks/useSalesInvoiceOptions'
import type { Customer } from '../../types/customers'
import type { SalesInvoice } from '../../types/salesInvoices'
import { CancelSalesInvoiceDialog } from './CancelSalesInvoiceDialog'
import { canCancel, formatAmount, statusBadges, statusTitle } from './salesInvoiceMetrics'

const CANCELLED_BANNER_MS = 4000

// Loads the selected invoice from GetSalesInvoiceById via Redux; the list page decides when it's shown
export function SalesInvoiceDetail() {
  const { salesInvoice, detailStatus, detailError, closeSalesInvoice, retry } = useSalesInvoiceDetail()
  const { salespersonName, findCustomer } = useSalesInvoiceOptions()
  const { cancelStatus, resetCancel } = useSalesInvoiceMutations()
  const [isCancelOpen, setCancelOpen] = useState(false)

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

  return (
    <div className="sales-invoices-page">
      <div className="sales-invoice-detail__bar">
        <nav className="sales-invoices-breadcrumb" aria-label="Breadcrumb">
          <button type="button" className="link-button" onClick={closeSalesInvoice}>← Sales Invoices</button>
          <span aria-hidden="true">/</span>
          <strong>{salesInvoice?.number || 'Sales Invoice'}</strong>
        </nav>
        {isLoaded && canCancel(salesInvoice) && (
          <Button className="danger-button" onClick={openCancel}>Cancel Invoice</Button>
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
          customer={findCustomer(salesInvoice.customerId)}
          salesperson={salespersonName(salesInvoice.salespersonId)}
        />
      )}

      {isCancelOpen && !isCancelled && salesInvoice && <CancelSalesInvoiceDialog invoice={salesInvoice} onClose={closeCancel} />}
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

interface SalesInvoiceProfileProps {
  invoice: SalesInvoice
  // Undefined until the customers load, or when the customer is no longer returned; the invoice's name is shown then
  customer: Customer | undefined
  salesperson: string
}

function SalesInvoiceProfile({ invoice, customer, salesperson }: SalesInvoiceProfileProps) {
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
                  <div className="strong">{invoice.vehicle || '—'}</div>
                  <div className="text-muted">
                    <span className="text-secondary">VIN:</span> <span className="mono text-xs">{invoice.vin || '—'}</span>
                  </div>
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
                      <TableCell colSpan={3} className="num text-muted">Sales Tax</TableCell>
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
        </aside>
      </div>
    </>
  )
}
