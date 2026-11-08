import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components'
import { BuildingBank24Regular } from '@fluentui/react-icons'
import { useBankAccountDetail } from '../../hooks/useBankAccountDetail'
import type { BankAccount } from '../../types/bankAccounts'
import { formatCurrency } from './bankAccountMetrics'

// Loads the selected account from GetBankAccountById via Redux; the list page decides when it's shown
export function BankAccountDetail() {
  const { bankAccount, detailStatus, detailError, closeBankAccount, retry } = useBankAccountDetail()

  return (
    <div className="bank-accounts-page">
      <nav className="bank-accounts-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closeBankAccount}>← Banks &amp; Accounts</button>
        <span aria-hidden="true">/</span>
        <strong>{bankAccount?.name ?? 'Bank Account'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="bank-accounts-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load bank account</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card bank-accounts-loading">
          <Spinner label="Loading bank account…" />
        </section>
      )}

      {detailStatus === 'success' && bankAccount && <BankAccountProfile bankAccount={bankAccount} />}
    </div>
  )
}

// The design has no account view; this mirrors the Vendors profile. Ledger and reconciliation wait for their own APIs.
function BankAccountProfile({ bankAccount }: { bankAccount: BankAccount }) {
  return (
    <div className="bank-account-overview">
      <section className="card bank-account-profile">
        <div className="bank-account-profile__header">
          <div className="bank-icon" aria-hidden="true"><BuildingBank24Regular /></div>
          <div>
            <h1>{bankAccount.name}</h1>
            <p>{bankAccount.bankName || '—'}</p>
          </div>
          <span className={`badge ${bankAccount.status === 'Active' ? 'badge-posted' : 'badge-cancelled'}`}>{bankAccount.status}</span>
        </div>
        <dl className="bank-account-profile__facts">
          <div><dt>Account Number:</dt> <dd className="mono">{bankAccount.accountNumber || '—'}</dd></div>
          <div><dt>Routing:</dt> <dd className="mono">{bankAccount.routing || '—'}</dd></div>
          <div><dt>Type:</dt> <dd>{bankAccount.type || '—'}</dd></div>
          <div><dt>Account ID:</dt> <dd className="mono">{bankAccount.id || '—'}</dd></div>
        </dl>
      </section>
      <div className="bank-account-stats">
        <div className="stat-card">
          <div className="stat-label">Book Balance</div>
          <div className={`stat-value ${bankAccount.bookBalance < 0 ? 'stat-value--red' : 'stat-value--blue'}`}>{formatCurrency(bankAccount.bookBalance)}</div>
        </div>
      </div>
    </div>
  )
}
