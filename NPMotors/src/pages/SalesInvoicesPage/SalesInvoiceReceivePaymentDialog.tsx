import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
} from '@fluentui/react-components'
import { Dismiss20Regular } from '@fluentui/react-icons'
import { useSalesInvoiceArLookup } from '../../hooks/useSalesInvoiceArLookup'
import type { ReceiptTarget } from '../../types/receipts'
import type { ReceivableAgingStatus } from '../../types/receivables'
import type { SalesInvoice } from '../../types/salesInvoices'
import { ReceivePaymentDialog } from '../AccountsReceivablePage/ReceivePaymentDialog'
import '../AccountsReceivablePage/ReceivePaymentDialog.css'

const AGING_STATUS = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' } as const satisfies Record<string, ReceivableAgingStatus>

// The payment is checked against, and shown with, the sales invoice's own figures and number
const toReceiptTarget = (invoice: SalesInvoice, arInvoiceId: string): ReceiptTarget => ({
  id: arInvoiceId,
  number: invoice.number,
  customerName: invoice.customerName,
  amount: invoice.total,
  paid: invoice.paid,
  balance: invoice.balance,
  agingStatus: AGING_STATUS[invoice.paymentStatus ?? 'unpaid'],
})

interface SalesInvoiceReceivePaymentDialogProps {
  // A copy taken when the dialog opened: the invoice reloads after the payment, and the confirmation keeps these figures
  invoice: SalesInvoice
  onClose: () => void
}

// Receive Payment from a sales invoice: finds its AR invoice, then opens the same payment form as Accounts Receivable
export function SalesInvoiceReceivePaymentDialog({ invoice, onClose }: SalesInvoiceReceivePaymentDialogProps) {
  const { arInvoiceId, lookupStatus, lookupError, retry } = useSalesInvoiceArLookup({
    salesInvoiceId: invoice.id,
    customerId: invoice.customerId,
    invoiceNumber: invoice.number,
  })

  if (lookupStatus === 'success' && arInvoiceId) {
    return <ReceivePaymentDialog invoice={toReceiptTarget(invoice, arInvoiceId)} onClose={onClose} />
  }

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open) onClose() }}>
      <DialogSurface className="receipt-dialog" aria-describedby="receipt-lookup-subtitle">
        <DialogBody className="receipt-dialog__body">
          <header className="receipt-dialog__header">
            <div>
              <DialogTitle>Receive Payment</DialogTitle>
              <p id="receipt-lookup-subtitle">{invoice.number || 'Sales Invoice'} · {invoice.customerName || '—'}</p>
            </div>
            <Button appearance="transparent" aria-label="Close receive payment form" icon={<Dismiss20Regular />} onClick={onClose} />
          </header>

          <DialogContent className="receipt-dialog__content">
            {lookupStatus === 'error' ? (
              <MessageBar intent="error">
                <MessageBarBody>{lookupError}</MessageBarBody>
                <MessageBarActions>
                  <Button onClick={retry}>Retry</Button>
                </MessageBarActions>
              </MessageBar>
            ) : lookupStatus === 'success' ? (
              <MessageBar intent="warning">
                <MessageBarBody>
                  No receivable was found for this invoice, so a payment can&apos;t be posted against it.
                </MessageBarBody>
              </MessageBar>
            ) : (
              <Spinner size="small" label="Finding the invoice's receivable…" />
            )}
          </DialogContent>

          <DialogActions className="receipt-dialog__footer">
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
