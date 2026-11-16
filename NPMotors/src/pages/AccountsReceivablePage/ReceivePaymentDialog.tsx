import { useState, type FormEvent } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Option,
  Spinner,
} from '@fluentui/react-components'
import { Checkmark24Regular, Dismiss20Regular } from '@fluentui/react-icons'
import { useReceiptBankAccountOptions } from '../../hooks/useReceiptBankAccountOptions'
import { useReceiptMutations } from '../../hooks/useReceiptMutations'
import type { PaymentMethod } from '../../types/common'
import type { ReceiptFieldErrors, ReceiptFormField, ReceiptFormValues, ReceiptTarget } from '../../types/receipts'
import { formatCurrencyExact } from './receivableMetrics'
import './ReceivePaymentDialog.css'

// The design's methods that the API's PaymentMethod enum has; it has no "Finance" value, so that option is left out
const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Credit Card' },
]

const isPaymentMethod = (value: unknown): value is PaymentMethod => paymentMethodOptions.some((option) => option.value === value)

const methodLabel = (method: PaymentMethod) => paymentMethodOptions.find((option) => option.value === method)?.label ?? method

// Money is compared in whole cents so 0.1 + 0.2 style rounding can't let an overpayment through
const toCents = (value: number) => Math.round(value * 100)

const pad = (value: number) => String(value).padStart(2, '0')

// Today in the user's time zone (toISOString would give tomorrow's date in the evening west of UTC)
const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function validate(values: ReceiptFormValues, balance: number): ReceiptFieldErrors {
  const errors: ReceiptFieldErrors = {}
  const amountText = values.amount.trim()
  const amount = Number(amountText)
  if (!amountText) errors.amount = 'Payment amount is required'
  else if (!Number.isFinite(amount)) errors.amount = 'Enter a valid amount'
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero'
  else if (!/^\d+(\.\d{1,2})?$/.test(amountText)) errors.amount = 'Use at most two decimal places'
  else if (toCents(amount) > toCents(balance)) errors.amount = `Amount cannot exceed balance of ${formatCurrencyExact(balance)}`
  if (!values.receiptDate) errors.receiptDate = 'Payment date is required'
  if (!values.bankAccountId) errors.bankAccountId = 'Choose the account the payment is deposited to'
  return errors
}

interface ReceivePaymentDialogProps {
  invoice: ReceiptTarget
  onClose: () => void
}

// Mounted only while open, so every opening starts from the full balance, today and the first account
export function ReceivePaymentDialog({ invoice, onClose }: ReceivePaymentDialogProps) {
  const { saveStatus, saveError, fieldErrors, recordPayment } = useReceiptMutations()
  const { bankAccountOptions, bankAccountOptionsStatus, bankAccountOptionsError, retry } = useReceiptBankAccountOptions()
  const [values, setValues] = useState<ReceiptFormValues>({
    receiptDate: todayIso(),
    amount: String(invoice.balance),
    paymentMethod: 'transfer',
    bankAccountId: '',
    reference: '',
  })
  const [clientErrors, setClientErrors] = useState<ReceiptFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<ReceiptFormField>>(new Set())
  // What was posted, for the confirmation view
  const [posted, setPosted] = useState<ReceiptFormValues | null>(null)
  const isSaving = saveStatus === 'loading'

  // Until the user picks one, the first active account is the deposit account
  const bankAccountId = values.bankAccountId || bankAccountOptions[0]?.id || ''
  const bankAccount = bankAccountOptions.find((option) => option.id === bankAccountId)
  const accountLabel = (option: { name: string; accountNumber: string }) =>
    option.accountNumber ? `${option.name} — ${option.accountNumber}` : option.name

  const errorFor = (field: ReceiptFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setField = <K extends ReceiptFormField>(field: K, value: ReceiptFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setClientErrors((current) => ({ ...current, [field]: undefined }))
    setEditedFields((current) => new Set(current).add(field))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const submitted = { ...values, bankAccountId }
    const errors = validate(submitted, invoice.balance)
    setClientErrors(errors)
    if (Object.keys(errors).length) return
    setEditedFields(new Set())
    setPosted(submitted)
    recordPayment(invoice.id, submitted)
  }

  const amount = Number(values.amount)
  const remainingCents = toCents(invoice.balance) - toCents(amount)
  const amountHint = errorFor('amount') || !(amount > 0) || remainingCents < 0
    ? undefined
    : remainingCents === 0
      ? 'This will fully settle the invoice.'
      : `Remaining balance after: ${formatCurrencyExact(remainingCents / 100)}`

  if (saveStatus === 'success' && posted) {
    const postedAmount = Number(posted.amount)
    const remaining = (toCents(invoice.balance) - toCents(postedAmount)) / 100
    return (
      <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open) onClose() }}>
        <DialogSurface className="receipt-dialog receipt-dialog--posted" aria-describedby="receipt-posted-summary">
          <DialogBody className="receipt-dialog__posted">
            <div className="receipt-dialog__check" aria-hidden="true"><Checkmark24Regular /></div>
            <DialogTitle>Payment Posted</DialogTitle>
            <p id="receipt-posted-summary">
              {formatCurrencyExact(postedAmount)} received from <strong>{invoice.customerName || 'the customer'}</strong>
            </p>
            <dl className="receipt-dialog__facts">
              <div><dt>Invoice</dt><dd className="mono">{invoice.number || '—'}</dd></div>
              <div><dt>Payment Date</dt><dd>{posted.receiptDate}</dd></div>
              <div><dt>Method</dt><dd>{methodLabel(posted.paymentMethod)}</dd></div>
              {bankAccount && <div><dt>Deposited To</dt><dd>{accountLabel(bankAccount)}</dd></div>}
              {posted.reference.trim() && <div><dt>Reference</dt><dd className="mono">{posted.reference.trim()}</dd></div>}
              <div>
                <dt>Balance Due</dt>
                <dd className={remaining > 0 ? 'text-amber' : 'text-green'}>{remaining > 0 ? formatCurrencyExact(remaining) : 'Fully settled'}</dd>
              </div>
            </dl>
            <DialogActions className="receipt-dialog__done">
              <Button appearance="primary" onClick={onClose}>Done</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    )
  }

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open && !isSaving) onClose() }}>
      <DialogSurface className="receipt-dialog" aria-describedby="receipt-dialog-subtitle">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="receipt-dialog__body">
            <header className="receipt-dialog__header">
              <div>
                <DialogTitle>Receive Payment</DialogTitle>
                <p id="receipt-dialog-subtitle">{invoice.number || 'Receivable'} · {invoice.customerName || '—'}</p>
              </div>
              <Button appearance="transparent" aria-label="Close receive payment form" icon={<Dismiss20Regular />} disabled={isSaving} onClick={onClose} />
            </header>

            <DialogContent className="receipt-dialog__content">
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}

              <dl className="receipt-dialog__summary">
                <div><dt>Invoice Total</dt><dd>{formatCurrencyExact(invoice.amount)}</dd></div>
                <div><dt>Already Paid</dt><dd className="text-green">{formatCurrencyExact(invoice.paid)}</dd></div>
                <div><dt>Balance Due</dt><dd className="text-amber strong">{formatCurrencyExact(invoice.balance)}</dd></div>
              </dl>

              <fieldset className="receipt-dialog__fields" disabled={isSaving}>
                <Field
                  label="Payment Amount"
                  required
                  validationState={errorFor('amount') ? 'error' : 'none'}
                  validationMessage={errorFor('amount')}
                  hint={amountHint}
                >
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    autoFocus
                    contentBefore="$"
                    className="mono"
                    value={values.amount}
                    onChange={(_, data) => setField('amount', data.value)}
                  />
                </Field>

                <div className="receipt-dialog__grid">
                  <Field
                    label="Payment Date"
                    required
                    validationState={errorFor('receiptDate') ? 'error' : 'none'}
                    validationMessage={errorFor('receiptDate')}
                  >
                    <Input type="date" value={values.receiptDate} onChange={(_, data) => setField('receiptDate', data.value)} />
                  </Field>
                  <Field
                    label="Payment Method"
                    validationState={errorFor('paymentMethod') ? 'error' : 'none'}
                    validationMessage={errorFor('paymentMethod')}
                  >
                    <Dropdown
                      value={methodLabel(values.paymentMethod)}
                      selectedOptions={[values.paymentMethod]}
                      onOptionSelect={(_, data) => { if (isPaymentMethod(data.optionValue)) setField('paymentMethod', data.optionValue) }}
                    >
                      {paymentMethodOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
                    </Dropdown>
                  </Field>
                </div>

                {bankAccountOptionsStatus === 'error' && (
                  <MessageBar intent="error">
                    <MessageBarBody>{bankAccountOptionsError}</MessageBarBody>
                    <MessageBarActions>
                      <Button onClick={retry}>Retry</Button>
                    </MessageBarActions>
                  </MessageBar>
                )}

                <Field
                  label="Deposit To"
                  required
                  validationState={errorFor('bankAccountId') ? 'error' : 'none'}
                  validationMessage={errorFor('bankAccountId')}
                  hint={bankAccountOptionsStatus === 'success' && bankAccountOptions.length === 0 ? 'There are no active bank accounts to deposit to.' : undefined}
                >
                  <Dropdown
                    placeholder={bankAccountOptionsStatus === 'loading' || bankAccountOptionsStatus === 'idle' ? 'Loading accounts…' : 'Select an account'}
                    disabled={bankAccountOptions.length === 0}
                    value={bankAccount ? accountLabel(bankAccount) : ''}
                    selectedOptions={bankAccountId ? [bankAccountId] : []}
                    onOptionSelect={(_, data) => { if (data.optionValue) setField('bankAccountId', data.optionValue) }}
                  >
                    {bankAccountOptions.map((option) => <Option key={option.id} value={option.id}>{accountLabel(option)}</Option>)}
                  </Dropdown>
                </Field>

                <Field
                  label="Reference / Cheque #"
                  validationState={errorFor('reference') ? 'error' : 'none'}
                  validationMessage={errorFor('reference')}
                >
                  <Input value={values.reference} maxLength={100} placeholder="Optional" onChange={(_, data) => setField('reference', data.value)} />
                </Field>
              </fieldset>
            </DialogContent>

            <DialogActions className="receipt-dialog__footer">
              <Button disabled={isSaving} onClick={onClose}>Cancel</Button>
              <Button type="submit" appearance="primary" disabled={isSaving} icon={isSaving ? <Spinner size="tiny" /> : undefined}>
                {isSaving ? 'Posting…' : 'Post Payment'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
