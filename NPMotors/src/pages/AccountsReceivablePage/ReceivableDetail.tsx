import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  ProgressBar,
  Spinner,
} from '@fluentui/react-components'
import { CheckmarkCircle16Regular, Clock16Regular, Document16Regular, Warning16Regular } from '@fluentui/react-icons'
import type { ReactElement } from 'react'
import { useReceivableDetail } from '../../hooks/useReceivableDetail'
import type { ReceivableDetail as ReceivableDetailData } from '../../types/receivables'
import { agingClass, formatCurrencyExact, getNameInitials, paidPercent, statusBadgeClass } from './receivableMetrics'

// Loads the selected AR invoice from GetArById via Redux; the list page decides when it's shown
export function ReceivableDetail() {
  const { receivable, detailStatus, detailError, closeReceivable, retry } = useReceivableDetail()

  return (
    <div className="receivables-page">
      <nav className="receivables-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closeReceivable}>← Accounts Receivable</button>
        <span aria-hidden="true">/</span>
        <strong>{receivable?.number || 'Receivable'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="receivables-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load receivable</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card receivables-loading">
          <Spinner label="Loading receivable…" />
        </section>
      )}

      {detailStatus === 'success' && receivable && <ReceivableProfile receivable={receivable} />}
    </div>
  )
}

interface TimelineStep {
  label: string
  date: string
  icon: ReactElement
  done: boolean
}

function ReceivableProfile({ receivable }: { receivable: ReceivableDetailData }) {
  const isSettled = receivable.balance <= 0
  const isOverdue = !isSettled && receivable.daysOverdue > 0
  const percent = paidPercent(receivable.paid, receivable.amount)
  const dash = (value: string) => value || '—'

  // Payment rows are left out: there is no endpoint for an AR invoice's receipts yet
  const timeline: TimelineStep[] = [
    { label: 'Invoice Created', date: receivable.date, icon: <Document16Regular />, done: true },
    isSettled
      ? { label: 'Fully Settled', date: '', icon: <CheckmarkCircle16Regular />, done: true }
      : { label: 'Payment Due', date: receivable.dueDate, icon: isOverdue ? <Warning16Regular /> : <Clock16Regular />, done: false },
  ]

  const agingText = isSettled
    ? 'Fully settled — nothing due'
    : isOverdue ? `${receivable.daysOverdue} days overdue` : 'Current — not yet due'

  return (
    <>
      <section className="card receivable-hero">
        <div className="receivable-hero__top">
          <div>
            <h1 className="mono">{dash(receivable.number)}</h1>
            <p>
              {dash(receivable.customerName)} · Issued {dash(receivable.date)} · Due {dash(receivable.dueDate)}
            </p>
          </div>
          <div className="receivable-hero__actions">
            <span className={`badge ${statusBadgeClass(receivable.agingStatus)}`}>{receivable.agingStatus}</span>
            <Button onClick={() => window.print()}>Print</Button>
          </div>
        </div>

        <div className="receivable-hero__progress">
          <div className="receivable-hero__progress-label">
            <span>Payment Progress</span>
            <span>{percent.toFixed(0)}% collected</span>
          </div>
          <ProgressBar value={percent / 100} color="success" thickness="large" aria-label="Payment progress" />
        </div>

        <dl className="receivable-hero__stats">
          <div><dt>Invoice Total</dt><dd>{formatCurrencyExact(receivable.amount)}</dd></div>
          <div><dt>Paid</dt><dd className="text-green">{formatCurrencyExact(receivable.paid)}</dd></div>
          <div><dt>Balance Due</dt><dd className={isSettled ? 'text-faint' : 'text-amber'}>{formatCurrencyExact(receivable.balance)}</dd></div>
          <div>
            <dt>Days Overdue</dt>
            <dd className={isOverdue ? 'text-red' : 'text-green'}>
              {isSettled ? 'Settled' : isOverdue ? `${receivable.daysOverdue}d` : 'Current'}
            </dd>
          </div>
        </dl>
      </section>

      <div className="receivable-layout">
        <div className="receivable-layout__main">
          <section className="card receivable-section">
            <h2 className="section-title">Customer</h2>
            <div className="receivable-customer">
              <div className="receivable-avatar" aria-hidden="true">{getNameInitials(receivable.customerName)}</div>
              <dl className="receivable-customer__facts">
                <div><dt>Name</dt><dd>{dash(receivable.customerName)}</dd></div>
                <div><dt>Phone</dt><dd>{dash(receivable.phone)}</dd></div>
                <div><dt>Email</dt><dd>{dash(receivable.email)}</dd></div>
                <div><dt>Address</dt><dd>{dash(receivable.address)}</dd></div>
              </dl>
            </div>
          </section>
        </div>

        <aside className="receivable-layout__side">
          <section className="card receivable-section">
            <h2 className="section-title">Aging Status</h2>
            <div className={`aging-box ${isSettled ? 'aging-current' : agingClass(receivable.daysOverdue)}`}>{agingText}</div>
            <dl className="receivable-facts">
              <div><dt>Invoice Date</dt><dd>{dash(receivable.date)}</dd></div>
              <div><dt>Due Date</dt><dd>{dash(receivable.dueDate)}</dd></div>
            </dl>
          </section>

          <section className="card receivable-section">
            <h2 className="section-title">Timeline</h2>
            <ol className="receivable-timeline">
              {timeline.map((step) => (
                <li key={step.label} className={step.done ? 'is-done' : ''}>
                  <span className="receivable-timeline__icon" aria-hidden="true">{step.icon}</span>
                  <div>
                    <div className="receivable-timeline__label">{step.label}</div>
                    {step.date && <div className="receivable-timeline__date">{step.date}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card receivable-section">
            <h2 className="section-title">Summary</h2>
            <dl className="receivable-summary">
              <div><dt>Invoice Total</dt><dd>{formatCurrencyExact(receivable.amount)}</dd></div>
              <div><dt>Paid</dt><dd className="text-green">{formatCurrencyExact(receivable.paid)}</dd></div>
              <div className="receivable-summary__total"><dt>Balance Due</dt><dd>{formatCurrencyExact(receivable.balance)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  )
}
