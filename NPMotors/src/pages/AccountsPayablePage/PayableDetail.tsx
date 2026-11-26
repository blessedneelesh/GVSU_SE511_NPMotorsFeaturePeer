import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  ProgressBar,
  Spinner,
} from '@fluentui/react-components'
import {
  BuildingFactory24Regular,
  CheckmarkCircle16Regular,
  Clock16Regular,
  Document16Regular,
  Payment16Regular,
  Warning16Regular,
} from '@fluentui/react-icons'
import type { ReactElement } from 'react'
import { usePayableDetail } from '../../hooks/usePayableDetail'
import type { PayableDetail as PayableDetailData } from '../../types/payables'
import { formatCurrencyExact, paidPercent, payableAgingClass, statusBadgeClass } from './payableMetrics'

// Loads the selected bill from GetApById via Redux; the list page decides when it's shown
export function PayableDetail() {
  const { payable, detailStatus, detailError, closePayable, retry } = usePayableDetail()

  return (
    <div className="payables-page">
      <nav className="payables-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closePayable}>← Accounts Payable</button>
        <span aria-hidden="true">/</span>
        <strong>{payable?.number || 'Bill'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="payables-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load bill</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card payables-loading">
          <Spinner label="Loading bill…" />
        </section>
      )}

      {detailStatus === 'success' && payable && <PayableProfile payable={payable} />}
    </div>
  )
}

interface TimelineStep {
  label: string
  date: string
  icon: ReactElement
  done: boolean
}

function PayableProfile({ payable }: { payable: PayableDetailData }) {
  const isSettled = payable.balance <= 0
  const isOverdue = !isSettled && payable.daysOverdue > 0
  const percent = paidPercent(payable.paid, payable.amount)
  const dash = (value: string) => value || '—'

  // GetApById has no payments or payment dates, so a payment shows as one undated step for the total paid
  const timeline: TimelineStep[] = [
    { label: 'Bill Received', date: payable.date, icon: <Document16Regular />, done: true },
    ...(payable.paid > 0 && !isSettled
      ? [{ label: `Partial Payment — ${formatCurrencyExact(payable.paid)}`, date: '', icon: <Payment16Regular />, done: true }]
      : []),
    isSettled
      ? { label: 'Fully Settled', date: '', icon: <CheckmarkCircle16Regular />, done: true }
      : { label: 'Payment Due', date: payable.dueDate, icon: isOverdue ? <Warning16Regular /> : <Clock16Regular />, done: false },
  ]

  const agingText = isSettled
    ? 'Fully settled — nothing due'
    : isOverdue ? `${payable.daysOverdue} days overdue` : 'Current — not yet due'

  return (
    <>
      <section className="card payable-hero">
        <div className="payable-hero__top">
          <div>
            <h1 className="mono">{dash(payable.number)}</h1>
            <p>{dash(payable.vendorName)} · Issued {dash(payable.date)} · Due {dash(payable.dueDate)}</p>
          </div>
          <div className="payable-hero__actions">
            <span className={`badge ${statusBadgeClass(payable.status)}`}>{payable.status}</span>
            <Button onClick={() => window.print()}>Print</Button>
          </div>
        </div>

        <div className="payable-hero__progress">
          <div className="payable-hero__progress-label">
            <span>Payment Progress</span>
            <span>{percent.toFixed(0)}% paid</span>
          </div>
          <ProgressBar value={percent / 100} color="success" thickness="large" aria-label="Payment progress" />
        </div>

        <dl className="payable-hero__stats">
          <div><dt>Bill Total</dt><dd>{formatCurrencyExact(payable.amount)}</dd></div>
          <div><dt>Paid</dt><dd className="text-green">{formatCurrencyExact(payable.paid)}</dd></div>
          <div><dt>Balance Due</dt><dd className={isSettled ? 'text-faint' : 'text-red'}>{formatCurrencyExact(payable.balance)}</dd></div>
          <div>
            <dt>Days Overdue</dt>
            <dd className={isOverdue ? 'text-red' : 'text-green'}>
              {isSettled ? 'Settled' : isOverdue ? `${payable.daysOverdue}d` : 'Current'}
            </dd>
          </div>
        </dl>
      </section>

      <div className="payable-layout">
        <div className="payable-layout__main">
          <section className="card payable-section">
            <h2 className="section-title">Vendor</h2>
            <div className="payable-vendor">
              <div className="payable-vendor__icon" aria-hidden="true"><BuildingFactory24Regular /></div>
              <dl className="payable-vendor__facts">
                <div><dt>Name</dt><dd>{dash(payable.vendorName)}</dd></div>
                <div><dt>Contact</dt><dd>{dash(payable.contact)}</dd></div>
                <div><dt>Phone</dt><dd>{dash(payable.phone)}</dd></div>
                <div><dt>Email</dt><dd>{dash(payable.email)}</dd></div>
                <div><dt>Address</dt><dd>{dash(payable.address)}</dd></div>
                {/* The API has no vendor type here; vehicle purchases say which vehicle the bill is for instead */}
                {payable.vehicleId && <div><dt>Vehicle</dt><dd>Vehicle #{payable.vehicleId}</dd></div>}
              </dl>
            </div>
          </section>
        </div>

        <aside className="payable-layout__side">
          <section className="card payable-section">
            <h2 className="section-title">Aging Status</h2>
            <div className={`aging-box ${isSettled ? 'aging-current' : payableAgingClass(payable.daysOverdue)}`}>{agingText}</div>
            <dl className="payable-facts">
              <div><dt>Bill Date</dt><dd>{dash(payable.date)}</dd></div>
              <div><dt>Due Date</dt><dd>{dash(payable.dueDate)}</dd></div>
            </dl>
          </section>

          <section className="card payable-section">
            <h2 className="section-title">Timeline</h2>
            <ol className="payable-timeline">
              {timeline.map((step) => (
                <li key={step.label} className={step.done ? 'is-done' : ''}>
                  <span className="payable-timeline__icon" aria-hidden="true">{step.icon}</span>
                  <div>
                    <div className="payable-timeline__label">{step.label}</div>
                    {step.date && <div className="payable-timeline__date">{step.date}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card payable-section">
            <h2 className="section-title">Summary</h2>
            <dl className="payable-summary">
              <div><dt>Bill Total</dt><dd>{formatCurrencyExact(payable.amount)}</dd></div>
              <div><dt>Paid</dt><dd className="text-green">{formatCurrencyExact(payable.paid)}</dd></div>
              <div className="payable-summary__total"><dt>Balance Due</dt><dd>{formatCurrencyExact(payable.balance)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  )
}
