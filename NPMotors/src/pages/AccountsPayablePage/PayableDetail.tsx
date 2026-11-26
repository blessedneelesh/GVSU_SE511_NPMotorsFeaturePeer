import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  ProgressBar,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components'
import {
  Add16Regular,
  BuildingFactory24Regular,
  CheckmarkCircle16Regular,
  Clock16Regular,
  Document16Regular,
  Payment16Regular,
  Warning16Regular,
} from '@fluentui/react-icons'
import type { ReactElement } from 'react'
import { usePayableDetail } from '../../hooks/usePayableDetail'
import { type UsePayablePaymentHistoryResult, usePayablePaymentHistory } from '../../hooks/usePayablePaymentHistory'
import type { PayableDetail as PayableDetailData, PayablePayment } from '../../types/payables'
import {
  formatCurrencyExact,
  paidPercent,
  payableAgingClass,
  paymentMethodLabel,
  sortPaymentsOldestFirst,
  statusBadgeClass,
} from './payableMetrics'
import { MakePaymentDialog } from './MakePaymentDialog'
import { useMakePaymentDialog } from './useMakePaymentDialog'

// Loads the selected bill from GetApById via Redux; the list page decides when it's shown
export function PayableDetail() {
  const { selectedId, payable, detailStatus, detailError, closePayable, retry } = usePayableDetail()
  // Loaded beside GetApById, by the selected id
  const paymentHistory = usePayablePaymentHistory(selectedId)
  // Kept here, not in the profile: a payment refetches the bill, which unmounts the profile while it loads
  const { paying, openPay, closePay } = useMakePaymentDialog()

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

      {detailStatus === 'success' && payable && (
        <PayableProfile payable={payable} paymentHistory={paymentHistory} onPay={() => openPay(payable)} />
      )}

      {paying && <MakePaymentDialog bill={paying} onClose={closePay} />}
    </div>
  )
}

interface TimelineStep {
  label: string
  date: string
  icon: ReactElement
  done: boolean
}

interface PayableProfileProps {
  payable: PayableDetailData
  paymentHistory: UsePayablePaymentHistoryResult
  onPay: () => void
}

function PayableProfile({ payable, paymentHistory, onPay }: PayableProfileProps) {
  const isSettled = payable.balance <= 0
  // Only a bill with something left to pay, and an id to post against, can take a payment
  const canPay = !isSettled && Boolean(payable.id)
  const isOverdue = !isSettled && payable.daysOverdue > 0
  const percent = paidPercent(payable.paid, payable.amount)
  const dash = (value: string) => value || '—'

  const paymentsOldestFirst = sortPaymentsOldestFirst(paymentHistory.payments)
  // Fully Settled is dated by the last payment that still counts, not a reversed one
  const lastPayment = paymentsOldestFirst.filter((payment) => payment.status !== 'Reversed').at(-1)

  const timeline: TimelineStep[] = [
    { label: 'Bill Received', date: payable.date, icon: <Document16Regular />, done: true },
    ...paymentsOldestFirst.map((payment) => ({
      label: `${payment.status === 'Reversed' ? 'Payment Reversed' : 'Payment Made'} — ${formatCurrencyExact(payment.amount)}`,
      date: payment.paymentDate,
      icon: <Payment16Regular />,
      // A reversed payment shows as a grey (not done) step
      done: payment.status !== 'Reversed',
    })),
    isSettled
      ? { label: 'Fully Settled', date: lastPayment?.paymentDate ?? '', icon: <CheckmarkCircle16Regular />, done: true }
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
            {canPay && <Button appearance="primary" onClick={onPay}>Make Payment</Button>}
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

          <PaymentHistory
            payments={[...paymentsOldestFirst].reverse()}
            status={paymentHistory.paymentHistoryStatus}
            error={paymentHistory.paymentHistoryError}
            canPay={canPay}
            onRetry={paymentHistory.retry}
            onPay={onPay}
          />
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
              {timeline.map((step, index) => (
                // Two same-day payments of the same amount would share a label, so the position is part of the key
                <li key={`${index}-${step.label}`} className={step.done ? 'is-done' : ''}>
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
            {canPay && (
              <Button appearance="primary" className="payable-summary__pay" onClick={onPay}>Make Payment</Button>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}

interface PaymentHistoryProps {
  // Newest first, as the design lists them
  payments: PayablePayment[]
  status: UsePayablePaymentHistoryResult['paymentHistoryStatus']
  error: string | null
  canPay: boolean
  onRetry: () => void
  onPay: () => void
}

// Vendor payments from GetPaymentHistory. A reload after a payment keeps the old rows until the new ones arrive.
function PaymentHistory({ payments, status, error, canPay, onRetry, onPay }: PaymentHistoryProps) {
  const isFirstLoad = (status === 'loading' || status === 'idle') && payments.length === 0
  const dash = (value: string) => value || '—'

  return (
    <section className="card payable-payments" aria-labelledby="payable-payments-title">
      <header className="payable-payments__header">
        <h2 id="payable-payments-title">Payment History</h2>
        {canPay && (
          <Button appearance="primary" size="small" icon={<Add16Regular />} onClick={onPay}>Make Payment</Button>
        )}
      </header>

      {status === 'error' ? (
        <MessageBar intent="error" className="payable-payments__message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load payments</MessageBarTitle>
            {error}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={onRetry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      ) : isFirstLoad ? (
        <div className="payable-payments__empty">
          <Spinner size="small" label="Loading payments…" />
        </div>
      ) : payments.length === 0 ? (
        <div className="payable-payments__empty">
          <Payment16Regular aria-hidden="true" />
          <span>No payments recorded yet</span>
          {canPay && <Button appearance="primary" size="small" onClick={onPay}>Make Payment</Button>}
        </div>
      ) : (
        <div className={`table-scroll${status === 'loading' ? ' is-refreshing' : ''}`}>
          <Table className="data-table payable-payments-table" aria-label="Payment history" aria-busy={status === 'loading'}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Payment #</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell>Reference</TableHeaderCell>
                <TableHeaderCell className="num">Amount</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                // Reversed payments stay listed but greyed out; the paid amount already leaves them out
                <TableRow
                  key={payment.id || `${payment.paymentNumber}-${index}`}
                  className={payment.status === 'Reversed' ? 'payment-row--reversed' : undefined}
                >
                  <TableCell className="text-xs text-muted">{dash(payment.paymentDate)}</TableCell>
                  <TableCell className="mono text-xs text-link">
                    {dash(payment.paymentNumber)}
                    {payment.status === 'Reversed' && <span className="badge badge-reversed">Reversed</span>}
                  </TableCell>
                  <TableCell className="text-secondary">{paymentMethodLabel(payment.paymentMethod)}</TableCell>
                  <TableCell className="mono text-xs text-muted">{dash(payment.reference)}</TableCell>
                  <TableCell className="num text-red payable-payments__amount">{formatCurrencyExact(payment.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
