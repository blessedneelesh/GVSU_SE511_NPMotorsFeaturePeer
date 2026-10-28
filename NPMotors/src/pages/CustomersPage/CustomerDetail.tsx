import type { SalesInvoice } from '../../types/npmotors'
import type { Customer } from '../../types/customers'
import { formatCurrency, getInitials } from './customerMetrics'

interface CustomerDetailProps {
  customer: Customer
  invoices: SalesInvoice[]
  onBack: () => void
}

export function CustomerDetail({ customer, invoices, onBack }: CustomerDetailProps) {
  const location = [customer.address, customer.city, [customer.state, customer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <div className="customers-page">
      <nav className="customers-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={onBack}>← Customers</button>
        <span aria-hidden="true">/</span>
        <strong>{customer.fullName}</strong>
      </nav>

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
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th><th>Date</th><th>Vehicle</th><th>Salesperson</th>
                <th className="num">Amount</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={8} className="table-empty">No invoices found</td></tr>
              ) : invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono text-xs text-link">{invoice.number}</td>
                  <td className="text-xs text-muted">{invoice.date}</td>
                  <td>{invoice.vehicle}</td>
                  <td className="text-xs text-muted">{invoice.salesperson}</td>
                  <td className="num">{formatCurrency(invoice.total)}</td>
                  <td className="num text-green">{formatCurrency(invoice.paid)}</td>
                  <td className={`num strong ${invoice.balance > 0 ? 'text-amber' : 'text-faint'}`}>{formatCurrency(invoice.balance)}</td>
                  <td><span className={`badge badge-${invoice.status.toLowerCase()}`}>{invoice.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
