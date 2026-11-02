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
import { salesInvoices } from '../../data/sampleData'
import { useCustomerDetail } from '../../hooks/useCustomerDetail'
import type { SalesInvoice } from '../../types/npmotors'
import type { Customer } from '../../types/customers'
import { formatCurrency, getInitials } from './customerMetrics'

// Loads the selected customer from GetCustomerById via Redux; the list page decides when it's shown
export function CustomerDetail() {
  const { customer, detailStatus, detailError, closeCustomer, retry } = useCustomerDetail()

  return (
    <div className="customers-page">
      <nav className="customers-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closeCustomer}>← Customers</button>
        <span aria-hidden="true">/</span>
        <strong>{customer?.fullName ?? 'Customer'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="customers-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load customer</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card customers-loading">
          <Spinner label="Loading customer…" />
        </section>
      )}

      {detailStatus === 'success' && customer && (
        // Invoices are still sample data until a sales invoice API exists
        <CustomerProfile customer={customer} invoices={salesInvoices.filter((invoice) => invoice.customerId === customer.id)} />
      )}
    </div>
  )
}

interface CustomerProfileProps {
  customer: Customer
  invoices: SalesInvoice[]
}

function CustomerProfile({ customer, invoices }: CustomerProfileProps) {
  const location = [customer.address, customer.city, [customer.state, customer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <>
      <div className="customer-overview">
        <section className="card customer-profile">
          <div className="customer-profile__header">
            <div className="customer-avatar customer-avatar--large">{getInitials(customer)}</div>
            <div>
              <h1>{customer.fullName}</h1>
              <p>{customer.email}</p>
              <p>{customer.phone}</p>
            </div>
            <span className={`badge ${customer.status === 'Active' ? 'badge-posted' : 'badge-cancelled'}`}>{customer.status}</span>
          </div>
          <dl className="customer-profile__facts">
            <div><dt>Address:</dt> <dd>{location || '—'}</dd></div>
            <div><dt>Customer ID:</dt> <dd className="mono">{customer.id || '—'}</dd></div>
          </dl>
        </section>
        <div className="customer-stats">
          <div className="stat-card">
            <div className="stat-label">Total Purchases</div>
            <div className="stat-value stat-value--blue">{formatCurrency(customer.totalPurchases)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Outstanding Balance</div>
            <div className={`stat-value ${customer.balance > 0 ? 'stat-value--amber' : 'stat-value--green'}`}>{formatCurrency(customer.balance)}</div>
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card__header"><h2>Sales Invoices</h2></div>
        <div className="table-scroll">
          <Table aria-label={`Sales invoices for ${customer.fullName}`} className="data-table invoices-table">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Invoice #</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Vehicle</TableHeaderCell>
                <TableHeaderCell>Salesperson</TableHeaderCell>
                <TableHeaderCell className="num">Amount</TableHeaderCell>
                <TableHeaderCell className="num">Paid</TableHeaderCell>
                <TableHeaderCell className="num">Balance</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="mono text-xs text-link">{invoice.number}</TableCell>
                  <TableCell className="text-xs text-muted">{invoice.date}</TableCell>
                  <TableCell>{invoice.vehicle}</TableCell>
                  <TableCell className="text-xs text-muted">{invoice.salesperson}</TableCell>
                  <TableCell className="num">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell className="num text-green">{formatCurrency(invoice.paid)}</TableCell>
                  <TableCell className={`num strong ${invoice.balance > 0 ? 'text-amber' : 'text-faint'}`}>{formatCurrency(invoice.balance)}</TableCell>
                  <TableCell>
                    <span className={`badge badge-${invoice.status.toLowerCase()}`}>{invoice.status}</span>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="table-empty">No invoices found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  )
}
