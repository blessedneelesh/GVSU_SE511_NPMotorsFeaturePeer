import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from '@fluentui/react-components'
import { formatAmount } from './salesInvoiceMetrics'
import './SalesInvoiceDialogs.css'

interface PostSalesInvoiceDialogProps {
  customerName: string
  vehicle: string
  total: number
  onConfirm: () => void
  onClose: () => void
}

// The design's "Confirm Post Invoice" step: posting can't be undone, so it gets a summary first
export function PostSalesInvoiceDialog({ customerName, vehicle, total, onConfirm, onClose }: PostSalesInvoiceDialogProps) {
  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open) onClose() }}>
      <DialogSurface className="sales-invoice-dialog" aria-describedby="post-invoice-description">
        <DialogBody className="sales-invoice-dialog__body">
          <DialogTitle>Confirm Post Invoice</DialogTitle>
          <DialogContent className="sales-invoice-dialog__content">
            <p id="post-invoice-description">
              This will post the sales invoice and automatically create all accounting entries. Posted transactions
              cannot be directly edited.
            </p>
            <dl className="sales-invoice-dialog__summary">
              <div><dt>Customer</dt><dd>{customerName}</dd></div>
              <div><dt>Vehicle</dt><dd>{vehicle}</dd></div>
              <div className="sales-invoice-dialog__summary-total"><dt>Total Amount</dt><dd className="mono">{formatAmount(total)}</dd></div>
            </dl>
          </DialogContent>
          <DialogActions className="sales-invoice-dialog__footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button appearance="primary" onClick={onConfirm}>Confirm &amp; Post</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
