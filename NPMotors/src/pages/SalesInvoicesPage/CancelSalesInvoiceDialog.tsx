import { useState, type FormEvent } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  MessageBar,
  MessageBarBody,
  Spinner,
  Textarea,
} from '@fluentui/react-components'
import { Warning24Regular } from '@fluentui/react-icons'
import { useSalesInvoiceMutations } from '../../hooks/useSalesInvoiceMutations'
import type { SalesInvoice } from '../../types/salesInvoices'
import './SalesInvoiceDialogs.css'

// SalesInvoiceCancelDto.reason: required, at most 500 characters
const REASON_MAX_LENGTH = 500

interface CancelSalesInvoiceDialogProps {
  invoice: SalesInvoice
  onClose: () => void
}

// Mounted only while open, so every opening starts with an empty reason
export function CancelSalesInvoiceDialog({ invoice, onClose }: CancelSalesInvoiceDialogProps) {
  const { cancelStatus, cancelError, cancel } = useSalesInvoiceMutations()
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>()
  const isCancelling = cancelStatus === 'loading'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!reason.trim()) {
      setReasonError('Enter a reason for cancelling this invoice')
      return
    }
    cancel(invoice.id, reason)
  }

  return (
    <Dialog open modalType="alert" onOpenChange={(_, data) => { if (!data.open && !isCancelling) onClose() }}>
      <DialogSurface className="sales-invoice-dialog" aria-describedby="cancel-invoice-description">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="sales-invoice-dialog__body">
            <div className="sales-invoice-dialog__heading">
              <Warning24Regular className="sales-invoice-dialog__warning" aria-hidden="true" />
              <div>
                <DialogTitle>Cancel Invoice {invoice.number}?</DialogTitle>
                <p id="cancel-invoice-description">
                  Cancelling this unpaid invoice records a reversal, closes its receivable, and releases the vehicle.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <DialogContent className="sales-invoice-dialog__content">
              <ul className="sales-invoice-dialog__effects">
                <li>Accounting reversal transaction will be recorded</li>
                <li>Open receivable will be removed</li>
                <li>Vehicle status will revert to Available</li>
                <li>No bank refund is required because no payment was received</li>
              </ul>

              {cancelError && (
                <MessageBar intent="error">
                  <MessageBarBody>{cancelError}</MessageBarBody>
                </MessageBar>
              )}

              <Field
                label="Reason for cancellation"
                required
                validationState={reasonError ? 'error' : 'none'}
                validationMessage={reasonError}
              >
                <Textarea
                  autoFocus
                  rows={2}
                  value={reason}
                  maxLength={REASON_MAX_LENGTH}
                  placeholder="Enter reason..."
                  disabled={isCancelling}
                  onChange={(_, data) => {
                    setReason(data.value)
                    setReasonError(undefined)
                  }}
                />
              </Field>
            </DialogContent>

            <DialogActions className="sales-invoice-dialog__footer">
              <Button disabled={isCancelling} onClick={onClose}>Keep Invoice</Button>
              <Button
                type="submit"
                className="sales-invoice-dialog__danger"
                disabled={isCancelling || !reason.trim()}
                icon={isCancelling ? <Spinner size="tiny" /> : undefined}
              >
                {isCancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
