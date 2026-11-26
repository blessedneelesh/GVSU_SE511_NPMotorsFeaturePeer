import { useEffect, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { Checkmark24Regular } from '@fluentui/react-icons'
import { useReceiptMutations } from '../../hooks/useReceiptMutations'
import { BankReceiptForm } from './BankReceiptForm'
import { formatCurrencyExact, paymentMethodLabel, type PostedBankReceipt } from './bankReceiptMetrics'
import './BankReceiptsPage.css'

export function BankReceiptsPage() {
  const { saveStatus, resetSave } = useReceiptMutations()
  // What was last submitted (UI-only); the save status itself lives in Redux
  const [posted, setPosted] = useState<PostedBankReceipt | null>(null)

  // Start with a clean save status, and don't leave one behind for the Receive Payment dialog
  useEffect(() => {
    resetSave()
    return resetSave
  }, [resetSave])

  const startNewReceipt = () => {
    resetSave()
    setPosted(null)
  }

  if (saveStatus === 'success' && posted) {
    return (
      <div className="bank-receipts-page">
        <section className="card bank-receipt-posted" aria-labelledby="bank-receipt-posted-title">
          <div className="bank-receipt-posted__check" aria-hidden="true"><Checkmark24Regular /></div>
          <h2 id="bank-receipt-posted-title">Bank Receipt Posted</h2>
          <p>
            {formatCurrencyExact(posted.amount)} received from <strong>{posted.partyName || '—'}</strong> has been posted successfully.
          </p>
          <dl className="bank-receipt-posted__facts">
            <div><dt>Deposited To</dt><dd>{posted.bankAccountName || '—'}</dd></div>
            {posted.invoiceNumber && <div><dt>Invoice</dt><dd className="mono">{posted.invoiceNumber}</dd></div>}
            <div><dt>Date</dt><dd>{posted.receiptDate}</dd></div>
            <div><dt>Payment Method</dt><dd>{paymentMethodLabel(posted.paymentMethod)}</dd></div>
            {posted.reference && <div><dt>Reference</dt><dd className="mono">{posted.reference}</dd></div>}
          </dl>
          <Button appearance="primary" onClick={startNewReceipt}>New Receipt</Button>
        </section>
      </div>
    )
  }

  return (
    <div className="bank-receipts-page">
      <header className="bank-receipts-header">
        <h1>Bank Receipt</h1>
        <p>Record money received into a bank account</p>
      </header>

      <BankReceiptForm onSubmit={setPosted} />
    </div>
  )
}
