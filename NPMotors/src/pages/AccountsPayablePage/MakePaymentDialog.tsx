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
import { usePayableMutations } from '../../hooks/usePayableMutations'
import { useReceiptBankAccountOptions } from '../../hooks/useReceiptBankAccountOptions'
import type { PaymentMethod } from '../../types/common'
import type { VendorPaymentFieldErrors, VendorPaymentFormField, VendorPaymentFormValues, VendorPaymentTarget } from '../../types/payables'
import { paymentMethodOptions } from '../AccountsReceivablePage/receivableMetrics'
import { formatCurrencyExact, paymentMethodLabel } from './payableMetrics'
import './MakePaymentDialog.css'

const isPaymentMethod = (value: unknown): value is PaymentMethod => paymentMethodOptions.some((option) => option.value === value)

// Money is compared in whole cents so 0.1 + 0.2 style rounding can't let an overpayment through
const toCents = (value: number) => Math.round(value * 100)

const pad = (value: number) => String(value).padStart(2, '0')

// Today in the user's time zone (toISOString would give tomorrow's date in the evening west of UTC)
const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Mirrors VendorPaymentCreateDto: amount 0.01 or more, a date, a bank account, reference up to 100 characters
function validate(values: VendorPaymentFormValues, balance: number): VendorPaymentFieldErrors {
  const errors: VendorPaymentFieldErrors = {}
  const amountText = values.amount.trim()
  const amount = Number(amountText)
  if (!amountText) errors.amount = 'Payment amount is required'
  else if (!Number.isFinite(amount)) errors.amount = 'Enter a valid amount'
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero'
  else if (!/^\d+(\.\d{1,2})?$/.test(amountText)) errors.amount = 'Use at most two decimal places'
  else if (toCents(amount) > toCents(balance)) errors.amount = `Amount cannot exceed balance of ${formatCurrencyExact(balance)}`
  if (!values.paymentDate) errors.paymentDate = 'Payment date is required'
  if (!values.bankAccountId) errors.bankAccountId = 'Choose the account to pay from'
  return errors
}

interface MakePaymentDialogProps {
  bill: VendorPaymentTarget
  onClose: () => void
}

// Mounted only while open, so every opening starts from the full balance, today and the first account
export function MakePaymentDialog({ bill, onClose }: MakePaymentDialogProps) {
  const { saveStatus, saveError, fieldErrors, recordPayment } = usePayableMutations()
  const { bankAccountOptions, bankAccountOptionsStatus, bankAccountOptionsError, retry } = useReceiptBankAccountOptions()
  const [values, setValues] = useState<VendorPaymentFormValues>({
    paymentDate: todayIso(),
    amount: String(bill.balance),
    paymentMethod: 'transfer',
    bankAccountId: '',
    reference: '',
  })
  const [clientErrors, setClientErrors] = useState<VendorPaymentFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<VendorPaymentFormField>>(new Set())
  // What was posted, for the confirmation view
  const [posted, setPosted] = useState<VendorPaymentFormValues | null>(null)
  const isSaving = saveStatus === 'loading'

  // Until the user picks one, the first active account pays
  const bankAccountId = values.bankAccountId || bankAccountOptions[0]?.id || ''
  const bankAccount = bankAccountOptions.find((option) => option.id === bankAccountId)
  const accountLabel = (option: { name: string; accountNumber: string }) =>
    option.accountNumber ? `${option.name} — ${option.accountNumber}` : option.name

  const errorFor = (field: VendorPaymentFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setField = <K extends VendorPaymentFormField>(field: K, value: VendorPaymentFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setClientErrors((current) => ({ ...current, [field]: undefined }))
    setEditedFields((current) => new Set(current).add(field))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const submitted = { ...values, bankAccountId }
    const errors = validate(submitted, bill.balance)
    setClientErrors(errors)
    if (Object.keys(errors).length) return
    setEditedFields(new Set())
    setPosted(submitted)
    recordPayment(bill.id, submitted)
  }

  const amount = Number(values.amount)
  const remainingCents = toCents(bill.balance) - toCents(amount)
  const amountHint = errorFor('amount') || !(amount > 0) || remainingCents < 0
    ? undefined
    : remainingCents === 0
      ? 'This will fully settle the bill.'
      : `Remaining balance after payment: ${formatCurrencyExact(remainingCents / 100)}`

  if (saveStatus === 'success' && posted) {
    const postedAmount = Number(posted.amount)
    const remaining = (toCents(bill.balance) - toCents(postedAmount)) / 100
    return (
      <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open) onClose() }}>
        <DialogSurface className="vendor-payment-dialog vendor-payment-dialog--posted" aria-describedby="vendor-payment-posted-summary">
          <DialogBody className="vendor-payment-dialog__posted">
            <div className="vendor-payment-dialog__check" aria-hidden="true"><Checkmark24Regular /></div>
            <DialogTitle>Payment Posted</DialogTitle>
            <p id="vendor-payment-posted-summary">
              {formatCurrencyExact(postedAmount)} paid to <strong>{bill.vendorName || 'the vendor'}</strong>
            </p>
            <dl className="vendor-payment-dialog__facts">
              <div><dt>Bill</dt><dd className="mono text-link">{bill.number || '—'}</dd></div>
              <div><dt>Payment Date</dt><dd>{posted.paymentDate}</dd></div>
              <div><dt>Method</dt><dd>{paymentMethodLabel(posted.paymentMethod)}</dd></div>
              {bankAccount && <div><dt>Paid From</dt><dd>{accountLabel(bankAccount)}</dd></div>}
              {posted.reference.trim() && <div><dt>Reference</dt><dd className="mono">{posted.reference.trim()}</dd></div>}
              <div>
                <dt>Balance Due</dt>
                <dd className={remaining > 0 ? 'text-red' : 'text-green'}>{remaining > 0 ? formatCurrencyExact(remaining) : 'Fully settled'}</dd>
              </div>
            </dl>
            <DialogActions className="vendor-payment-dialog__done">
              <Button appearance="primary" onClick={onClose}>Done</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    )
  }

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open && !isSaving) onClose() }}>
      <DialogSurface className="vendor-payment-dialog" aria-describedby="vendor-payment-dialog-subtitle">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="vendor-payment-dialog__body">
            <header className="vendor-payment-dialog__header">
              <div>
                <DialogTitle>Make Payment</DialogTitle>
                <p id="vendor-payment-dialog-subtitle">{bill.number || 'Bill'} · {bill.vendorName || '—'}</p>
              </div>
              <Button appearance="transparent" aria-label="Close make payment form" icon={<Dismiss20Regular />} disabled={isSaving} onClick={onClose} />
            </header>

            <DialogContent className="vendor-payment-dialog__content">
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}

              <dl className="vendor-payment-dialog__summary">
                <div><dt>Bill Total</dt><dd>{formatCurrencyExact(bill.amount)}</dd></div>
                <div><dt>Already Paid</dt><dd className="text-green">{formatCurrencyExact(bill.paid)}</dd></div>
                <div><dt>Balance Due</dt><dd className="text-red strong">{formatCurrencyExact(bill.balance)}</dd></div>
              </dl>

              <fieldset className="vendor-payment-dialog__fields" disabled={isSaving}>
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

                <div className="vendor-payment-dialog__grid">
                  <Field
                    label="Payment Date"
                    required
                    validationState={errorFor('paymentDate') ? 'error' : 'none'}
                    validationMessage={errorFor('paymentDate')}
                  >
                    <Input type="date" value={values.paymentDate} onChange={(_, data) => setField('paymentDate', data.value)} />
                  </Field>
                  <Field
                    label="Payment Method"
                    validationState={errorFor('paymentMethod') ? 'error' : 'none'}
                    validationMessage={errorFor('paymentMethod')}
                  >
                    <Dropdown
                      value={paymentMethodLabel(values.paymentMethod)}
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
                  label="Pay From"
                  required
                  validationState={errorFor('bankAccountId') ? 'error' : 'none'}
                  validationMessage={errorFor('bankAccountId')}
                  hint={bankAccountOptionsStatus === 'success' && bankAccountOptions.length === 0 ? 'There are no active bank accounts to pay from.' : undefined}
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

            <DialogActions className="vendor-payment-dialog__footer">
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
