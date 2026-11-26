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
  CheckmarkCircle16Regular,
  Clock16Regular,
  Document16Regular,
  Payment16Regular,
  Warning16Regular,
} from '@fluentui/react-icons'
import type { ReactElement } from 'react'
import { useReceivableDetail } from '../../hooks/useReceivableDetail'
import { type UseReceiptPaymentHistoryResult, useReceiptPaymentHistory } from '../../hooks/useReceiptPaymentHistory'
import type { ReceiptPayment } from '../../types/receipts'
import type { ReceivableDetail as ReceivableDetailData } from '../../types/receivables'
import {
  agingClass,
  canReceivePayment,
  formatCurrencyExact,
  getNameInitials,
  paidPercent,
  paymentMethodLabel,
  sortPaymentsOldestFirst,
  statusBadgeClass,
} from './receivableMetrics'
import { ReceivePaymentDialog } from './ReceivePaymentDialog'
import { useReceivePaymentDialog } from './useReceivePaymentDialog'

// Loads the selected AR invoice from GetArById via Redux; the list page decides when it's shown
export function ReceivableDetail() {
  const { selectedId, receivable, detailStatus, detailError, closeReceivable, retry } = useReceivableDetail()
  // Loaded beside GetArById, by the selected id; a posted payment reloads both
  const paymentHistory = useReceiptPaymentHistory(selectedId)
  // Kept here, not in the profile: a payment refetches the invoice, which unmounts the profile while it loads
  const { receiving, openReceive, closeReceive } = useReceivePaymentDialog()

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

      {detailStatus === 'success' && receivable && (
        <ReceivableProfile receivable={receivable} paymentHistory={paymentHistory} onReceive={() => openReceive(receivable)} />
      )}

      {receiving && <ReceivePaymentDialog invoice={receiving} onClose={closeReceive} />}
    </div>
  )
}

interface TimelineStep {
  label: string
  date: string
  icon: ReactElement
  done: boolean
}

interface ReceivableProfileProps {
  receivable: ReceivableDetailData
  paymentHistory: UseReceiptPaymentHistoryResult
  onReceive: () => void
}

function ReceivableProfile({ receivable, paymentHistory, onReceive }: ReceivableProfileProps) {
  const isSettled = receivable.balance <= 0
  const canReceive = canReceivePayment(receivable)
  const isOverdue = !isSettled && receivable.daysOverdue > 0
  const percent = paidPercent(receivable.paid, receivable.amount)
  const dash = (value: string) => value || '—'

  const paymentsOldestFirst = sortPaymentsOldestFirst(paymentHistory.payments)
  // Fully Settled is dated by the last receipt that still counts, not a reversed one
  const lastPayment = paymentsOldestFirst.filter((payment) => payment.status !== 'Reversed').at(-1)

  const timeline: TimelineStep[] = [
    { label: 'Invoice Created', date: receivable.date, icon: <Document16Regular />, done: true },
    ...paymentsOldestFirst.map((payment) => ({
      label: `${payment.status === 'Reversed' ? 'Payment Reversed' : 'Payment Received'} — ${formatCurrencyExact(payment.amount)}`,
      date: payment.receiptDate,
      icon: <Payment16Regular />,
      // A reversed receipt shows as a grey (not done) step
      done: payment.status !== 'Reversed',
    })),
    isSettled
      ? { label: 'Fully Settled', date: lastPayment?.receiptDate ?? '', icon: <CheckmarkCircle16Regular />, done: true }
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
            {canReceive && <Button appearance="primary" disabled={!receivable.id} onClick={onReceive}>Receive Payment</Button>}
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

          <PaymentHistory
            payments={[...paymentsOldestFirst].reverse()}
            status={paymentHistory.paymentHistoryStatus}
            error={paymentHistory.paymentHistoryError}
            canReceive={canReceive && Boolean(receivable.id)}
            onRetry={paymentHistory.retry}
            onReceive={onReceive}
          />
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
              {timeline.map((step, index) => (
                // Two same-day payments of the same amount would share a label, so the position is part of the key
                <li key={`${index}-${step.label}`} className={step.done ? 'is-done' : ''}>
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
            {canReceive && (
              <Button appearance="primary" className="receivable-summary__receive" disabled={!receivable.id} onClick={onReceive}>
                Receive Payment
              </Button>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}

interface PaymentHistoryProps {
  // Newest first, as the design lists them
  payments: ReceiptPayment[]
  status: UseReceiptPaymentHistoryResult['paymentHistoryStatus']
  error: string | null
  canReceive: boolean
  onRetry: () => void
  onReceive: () => void
}

// Receipts from GetPaymentHistory. A reload after a payment keeps the old rows until the new ones arrive.
function PaymentHistory({ payments, status, error, canReceive, onRetry, onReceive }: PaymentHistoryProps) {
  const isFirstLoad = (status === 'loading' || status === 'idle') && payments.length === 0
  const dash = (value: string) => value || '—'

  return (
    <section className="card receivable-payments" aria-labelledby="receivable-payments-title">
      <header className="receivable-payments__header">
        <h2 id="receivable-payments-title">Payment History</h2>
        {canReceive && (
          <Button appearance="primary" size="small" icon={<Add16Regular />} onClick={onReceive}>Receive Payment</Button>
        )}
      </header>

      {status === 'error' ? (
        <MessageBar intent="error" className="receivable-payments__message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load payments</MessageBarTitle>
            {error}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={onRetry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      ) : isFirstLoad ? (
        <div className="receivable-payments__empty">
          <Spinner size="small" label="Loading payments…" />
        </div>
      ) : payments.length === 0 ? (
        <div className="receivable-payments__empty">
          <Payment16Regular aria-hidden="true" />
          <span>No payments recorded yet</span>
        </div>
      ) : (
        <div className={`table-scroll${status === 'loading' ? ' is-refreshing' : ''}`}>
          <Table className="data-table receivable-payments-table" aria-label="Payment history" aria-busy={status === 'loading'}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Receipt #</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell>Deposited To</TableHeaderCell>
                <TableHeaderCell>Reference</TableHeaderCell>
                <TableHeaderCell className="num">Amount</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                // Reversed receipts stay listed but greyed out; the paid amount already leaves them out
                <TableRow
                  key={payment.id || `${payment.receiptNumber}-${index}`}
                  className={payment.status === 'Reversed' ? 'payment-row--reversed' : undefined}
                >
                  <TableCell className="text-xs text-muted">{dash(payment.receiptDate)}</TableCell>
                  <TableCell className="mono text-xs text-link">
                    {/* The badge stacks under the number: the fixed-width column has no room beside it */}
                    <span className="payment-number">
                      {dash(payment.receiptNumber)}
                      {payment.status === 'Reversed' && <span className="badge badge-reversed">Reversed</span>}
                    </span>
                  </TableCell>
                  <TableCell className="text-secondary">{paymentMethodLabel(payment.paymentMethod)}</TableCell>
                  <TableCell className="text-secondary">{dash(payment.bankAccountName)}</TableCell>
                  <TableCell className="mono text-xs text-muted">{dash(payment.reference)}</TableCell>
                  <TableCell className="num text-green receivable-payments__amount">{formatCurrencyExact(payment.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
