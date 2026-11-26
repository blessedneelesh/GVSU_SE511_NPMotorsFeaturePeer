import { useEffect, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { Checkmark24Regular } from '@fluentui/react-icons'
import { usePayableMutations } from '../../hooks/usePayableMutations'
import { BankPaymentForm } from './BankPaymentForm'
import { formatCurrencyExact, paymentMethodLabel, type PostedBankPayment, toCents } from './bankPaymentMetrics'
import './BankPaymentsPage.css'

export function BankPaymentsPage() {
  const { saveStatus, resetSave } = usePayableMutations()
  // What was last submitted (UI-only); the save status itself lives in Redux
  const [posted, setPosted] = useState<PostedBankPayment | null>(null)

  // Start with a clean save status, and don't leave one behind for the Make Payment dialog
  useEffect(() => {
    resetSave()
    return resetSave
  }, [resetSave])

  const startNewPayment = () => {
    resetSave()
    setPosted(null)
  }

  if (saveStatus === 'success' && posted) {
    const newBalance = posted.balanceBefore === null ? null : (toCents(posted.balanceBefore) - toCents(posted.amount)) / 100
    return (
      <div className="bank-payments-page">
        <section className="card bank-payment-posted" aria-labelledby="bank-payment-posted-title">
          <div className="bank-payment-posted__check" aria-hidden="true"><Checkmark24Regular /></div>
          <h2 id="bank-payment-posted-title">Bank Payment Posted</h2>
          <p>
            {formatCurrencyExact(posted.amount)} paid to <strong>{posted.payeeName || '—'}</strong> has been posted successfully.
          </p>
          <dl className="bank-payment-posted__facts">
            <div><dt>Paid From</dt><dd>{posted.bankAccountName || '—'}</dd></div>
            {posted.billNumber && <div><dt>Bill</dt><dd className="mono">{posted.billNumber}</dd></div>}
            {posted.paymentCategory && <div><dt>Debit Account</dt><dd>{posted.paymentCategory}</dd></div>}
            <div><dt>Date</dt><dd>{posted.paymentDate}</dd></div>
            <div><dt>Payment Method</dt><dd>{paymentMethodLabel(posted.paymentMethod)}</dd></div>
            {posted.reference && <div><dt>Reference</dt><dd className="mono">{posted.reference}</dd></div>}
            {newBalance !== null && (
              <div className="bank-payment-posted__total"><dt>Updated Balance</dt><dd className="mono">{formatCurrencyExact(newBalance)}</dd></div>
            )}
          </dl>
          <Button appearance="primary" onClick={startNewPayment}>New Payment</Button>
        </section>
      </div>
    )
  }

  return (
    <div className="bank-payments-page">
      <header className="bank-payments-header">
        <h1>Bank Payment</h1>
        <p>Record a payment made from a bank account</p>
      </header>

      <BankPaymentForm onSubmit={setPosted} />
    </div>
  )
}
