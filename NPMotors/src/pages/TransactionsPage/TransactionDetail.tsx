import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components'
import { useTransactionDetail } from '../../hooks/useTransactionDetail'
import type { Transaction } from '../../types/transactions'
import { DIRECTION_LABELS, formatDateTime, formatSignedAmount, statusBadgeClass } from './transactionMetrics'

// Loads the selected transaction from GetTransactionById via Redux; the list page decides when it's shown
export function TransactionDetail() {
  const { transaction, detailStatus, detailError, closeTransaction, retry } = useTransactionDetail()

  return (
    <div className="transactions-page">
      <nav className="transactions-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closeTransaction}>← Transactions</button>
        <span aria-hidden="true">/</span>
        <strong>{transaction?.number || 'Transaction'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="transactions-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load transaction</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card transactions-loading">
          <Spinner label="Loading transaction…" />
        </section>
      )}

      {detailStatus === 'success' && transaction && <TransactionProfile transaction={transaction} />}
    </div>
  )
}

// The design has no transaction view; this lays out every field GetTransactionById returns
function TransactionProfile({ transaction }: { transaction: Transaction }) {
  const created = [formatDateTime(transaction.createdAt), transaction.createdBy].filter(Boolean).join(' · ')

  return (
    <div className="transaction-overview">
      <section className="card transaction-profile">
        <div className="transaction-profile__header">
          <div>
            <h1 className="mono">{transaction.number || 'Transaction'}</h1>
            <p>{transaction.description || '—'}</p>
          </div>
          <div className="transaction-profile__badges">
            {transaction.type && <span className="type-chip">{transaction.type}</span>}
            {transaction.status && <span className={`badge ${statusBadgeClass(transaction.status)}`}>{transaction.status}</span>}
          </div>
        </div>
        <dl className="transaction-profile__facts">
          <div><dt>Date:</dt> <dd>{transaction.date || '—'}</dd></div>
          <div><dt>Bank Account:</dt> <dd>{transaction.bankAccountName || '—'}</dd></div>
          <div><dt>Direction:</dt> <dd>{DIRECTION_LABELS[transaction.direction]}</dd></div>
          <div><dt>Party:</dt> <dd>{transaction.party || '—'}</dd></div>
          <div><dt>Source #:</dt> <dd className="mono">{transaction.sourceNumber || '—'}</dd></div>
          <div><dt>Transaction ID:</dt> <dd className="mono">{transaction.id || '—'}</dd></div>
          <div><dt>Created:</dt> <dd>{created || '—'}</dd></div>
        </dl>
      </section>
      <div className="transaction-stats">
        <div className="stat-card">
          <div className="stat-label">Amount</div>
          <div className={`stat-value ${transaction.direction === 'in' ? 'stat-value--green' : 'stat-value--red'}`}>{formatSignedAmount(transaction)}</div>
        </div>
      </div>
    </div>
  )
}
