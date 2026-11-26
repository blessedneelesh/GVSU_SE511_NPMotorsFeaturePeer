import { useState, type FormEvent } from 'react'
import {
  Button,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Option,
  Radio,
  RadioGroup,
  Spinner,
  Textarea,
} from '@fluentui/react-components'
import { useReceiptBankAccountOptions } from '../../hooks/useReceiptBankAccountOptions'
import { useReceiptCustomerInvoices } from '../../hooks/useReceiptCustomerInvoices'
import { useReceiptMutations } from '../../hooks/useReceiptMutations'
import { useReceivableCustomerOptions } from '../../hooks/useReceivableCustomerOptions'
import type { PaymentMethod } from '../../types/common'
import type { Receivable } from '../../types/receivables'
import type { BankReceiptFormField, BankReceiptFormValues, ReceiptFieldErrors, ReceiptFormValues, ReceiptPartyType } from '../../types/receipts'
import {
  bankAccountLabel,
  formatCurrencyExact,
  paymentMethodLabel,
  paymentMethodOptions,
  type PostedBankReceipt,
  todayIsoDate,
  toCents,
} from './bankReceiptMetrics'

const partyOptions: { value: ReceiptPartyType; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'other', label: 'Other Party' },
]

const isPartyType = (value: unknown): value is ReceiptPartyType => partyOptions.some((option) => option.value === value)
const isPaymentMethod = (value: unknown): value is PaymentMethod => paymentMethodOptions.some((option) => option.value === value)

const EXCEEDS_INVOICE_MESSAGE = 'Amount exceeds the selected invoice balance.'
const MAX_REFERENCE_LENGTH = 100
const MAX_PAYER_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 500

const emptyForm = (): BankReceiptFormValues => ({
  receiptDate: todayIsoDate(),
  amount: '',
  // The design's default method
  paymentMethod: 'check',
  bankAccountId: '',
  reference: '',
  partyType: 'customer',
  customerId: '',
  arInvoiceId: '',
  payer: '',
  description: '',
})

// Required fields follow the design, plus an invoice for customers: RecordArPayment always posts against one
function validate(values: BankReceiptFormValues, invoice: Receivable | undefined): ReceiptFieldErrors {
  const errors: ReceiptFieldErrors = {}
  if (!values.receiptDate) errors.receiptDate = 'Receipt date is required'
  if (!values.bankAccountId) errors.bankAccountId = 'Select the account the money is deposited to'
  if (values.partyType === 'customer') {
    if (!values.customerId) errors.customerId = 'Select the customer who paid'
    else if (!values.arInvoiceId) errors.arInvoiceId = 'Select the invoice this payment is for'
  } else if (!values.payer.trim()) {
    errors.payer = 'Enter who the money was received from'
  }

  const amountText = values.amount.trim()
  const amount = Number(amountText)
  if (!amountText) errors.amount = 'Amount is required'
  else if (!Number.isFinite(amount)) errors.amount = 'Enter a valid amount'
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero'
  else if (!/^\d+(\.\d{1,2})?$/.test(amountText)) errors.amount = 'Use at most two decimal places'
  else if (invoice && toCents(amount) > toCents(invoice.balance)) errors.amount = EXCEEDS_INVOICE_MESSAGE
  return errors
}

interface BankReceiptFormProps {
  // Called with what is being posted, just before it is sent; the page shows it once the post succeeds
  onSubmit: (posted: PostedBankReceipt) => void
}

// The Bank Receipt card and its summary. "Received From" decides the endpoint: a customer's payment goes to
// RecordArPayment against the chosen invoice, anything else to RecordMiscReceipt.
export function BankReceiptForm({ onSubmit }: BankReceiptFormProps) {
  const { saveStatus, saveError, fieldErrors, recordPayment, recordMisc } = useReceiptMutations()
  const { bankAccountOptions, bankAccountOptionsStatus, bankAccountOptionsError, retry: retryAccounts } = useReceiptBankAccountOptions()
  const { customerOptions, customerOptionsStatus, customerOptionsError, retry: retryCustomers } = useReceivableCustomerOptions()
  const [values, setValues] = useState<BankReceiptFormValues>(emptyForm)
  const { invoices, invoicesStatus, invoicesError, retry: retryInvoices } = useReceiptCustomerInvoices(
    values.partyType === 'customer' ? values.customerId : '',
  )
  const [clientErrors, setClientErrors] = useState<ReceiptFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<BankReceiptFormField>>(new Set())
  const isSaving = saveStatus === 'loading'
  const isCustomer = values.partyType === 'customer'

  const bankAccount = bankAccountOptions.find((option) => option.id === values.bankAccountId)
  const customer = customerOptions.find((option) => option.id === values.customerId)
  const invoice = invoices.find((option) => option.id === values.arInvoiceId)
  const customerBalance = invoices.reduce((sum, option) => sum + option.balance, 0)
  const amount = Number(values.amount)
  const summaryAmount = Number.isFinite(amount) && amount > 0 ? amount : 0
  const isLoadingAccounts = (bankAccountOptionsStatus === 'loading' || bankAccountOptionsStatus === 'idle') && bankAccountOptions.length === 0
  const isLoadingCustomers = (customerOptionsStatus === 'loading' || customerOptionsStatus === 'idle') && customerOptions.length === 0

  // Shown while typing, like the design; everything else waits for submit
  const liveErrors: ReceiptFieldErrors = {
    amount: invoice && amount > 0 && toCents(amount) > toCents(invoice.balance) ? EXCEEDS_INVOICE_MESSAGE : undefined,
  }

  const errorFor = (field: BankReceiptFormField) =>
    clientErrors[field] ?? liveErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setFields = (changes: Partial<BankReceiptFormValues>) => {
    const fields = Object.keys(changes) as BankReceiptFormField[]
    setValues((current) => ({ ...current, ...changes }))
    setClientErrors((current) => {
      const next = { ...current }
      for (const field of fields) delete next[field]
      return next
    })
    setEditedFields((current) => {
      const next = new Set(current)
      for (const field of fields) next.add(field)
      return next
    })
  }

  // Switching party or customer drops the invoice picked for the previous one
  const setPartyType = (partyType: ReceiptPartyType) => setFields({ partyType, arInvoiceId: '' })
  const setCustomer = (customerId: string) => setFields({ customerId, arInvoiceId: '' })
  // Picking an invoice offers its full balance until the user types an amount
  const setInvoice = (arInvoiceId: string) => {
    const picked = invoices.find((option) => option.id === arInvoiceId)
    setFields(picked && !values.amount.trim() ? { arInvoiceId, amount: String(picked.balance) } : { arInvoiceId })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validate(values, invoice)
    setClientErrors(errors)
    if (Object.keys(errors).length) return
    setEditedFields(new Set())

    const receipt: ReceiptFormValues = {
      receiptDate: values.receiptDate,
      amount: values.amount.trim(),
      paymentMethod: values.paymentMethod,
      bankAccountId: values.bankAccountId,
      reference: values.reference,
    }
    onSubmit({
      amount: Number(receipt.amount),
      receiptDate: receipt.receiptDate,
      paymentMethod: receipt.paymentMethod,
      bankAccountName: bankAccount ? bankAccountLabel(bankAccount) : '',
      partyName: isCustomer ? (customer?.name ?? '') : values.payer.trim(),
      invoiceNumber: isCustomer ? (invoice?.number ?? '') : '',
      reference: receipt.reference.trim(),
    })
    if (isCustomer) recordPayment(values.arInvoiceId, receipt)
    else recordMisc({ payer: values.payer, description: values.description, values: receipt })
  }

  const invoicesPlaceholder = invoicesStatus === 'loading' && invoices.length === 0
    ? 'Loading invoices…'
    : invoices.length === 0 ? 'No open invoices' : 'Select an invoice'

  return (
    <form className="bank-receipts-grid" onSubmit={handleSubmit} noValidate aria-label="Bank receipt">
      <section className="card bank-receipt-form">
        {saveError && (
          <MessageBar intent="error" className="bank-receipt-form__message">
            <MessageBarBody>{saveError}</MessageBarBody>
          </MessageBar>
        )}

        <fieldset className="bank-receipt-form__fields" disabled={isSaving}>
          <div className="bank-receipt-form__row">
            <Field label="Date" required validationState={errorFor('receiptDate') ? 'error' : 'none'} validationMessage={errorFor('receiptDate')}>
              <Input type="date" value={values.receiptDate} onChange={(_, data) => setFields({ receiptDate: data.value })} />
            </Field>
            <Field label="Reference" validationState={errorFor('reference') ? 'error' : 'none'} validationMessage={errorFor('reference')}>
              <Input
                value={values.reference}
                maxLength={MAX_REFERENCE_LENGTH}
                placeholder="Cheque#, wire ref..."
                onChange={(_, data) => setFields({ reference: data.value })}
              />
            </Field>
          </div>

          {bankAccountOptionsStatus === 'error' && (
            <MessageBar intent="warning">
              <MessageBarBody>{bankAccountOptionsError}</MessageBarBody>
              <MessageBarActions>
                <Button size="small" onClick={retryAccounts}>Retry</Button>
              </MessageBarActions>
            </MessageBar>
          )}

          <Field
            label="Bank Account"
            required
            validationState={errorFor('bankAccountId') ? 'error' : 'none'}
            validationMessage={errorFor('bankAccountId')}
            hint={bankAccount
              ? <>Current balance: <span className="mono strong">{formatCurrencyExact(bankAccount.bookBalance)}</span></>
              : bankAccountOptionsStatus === 'success' && bankAccountOptions.length === 0 ? 'There are no active bank accounts to deposit to.' : undefined}
          >
            <Dropdown
              placeholder={isLoadingAccounts ? 'Loading accounts…' : 'Select bank account...'}
              disabled={bankAccountOptions.length === 0}
              value={bankAccount ? bankAccountLabel(bankAccount) : ''}
              selectedOptions={values.bankAccountId ? [values.bankAccountId] : []}
              onOptionSelect={(_, data) => { if (data.optionValue) setFields({ bankAccountId: data.optionValue }) }}
            >
              {bankAccountOptions.map((option) => <Option key={option.id} value={option.id}>{bankAccountLabel(option)}</Option>)}
            </Dropdown>
          </Field>

          <div className="bank-receipt-form__party">
            <Field label="Received From">
              <RadioGroup
                layout="horizontal"
                className="bank-receipt-form__party-toggle"
                value={values.partyType}
                onChange={(_, data) => { if (isPartyType(data.value)) setPartyType(data.value) }}
              >
                {partyOptions.map((option) => <Radio key={option.value} value={option.value} label={option.label} />)}
              </RadioGroup>
            </Field>

            {isCustomer ? (
              <>
                {customerOptionsStatus === 'error' && (
                  <MessageBar intent="warning">
                    <MessageBarBody>{customerOptionsError}</MessageBarBody>
                    <MessageBarActions>
                      <Button size="small" onClick={retryCustomers}>Retry</Button>
                    </MessageBarActions>
                  </MessageBar>
                )}
                <Field
                  label="Customer"
                  required
                  validationState={errorFor('customerId') ? 'error' : 'none'}
                  validationMessage={errorFor('customerId')}
                  hint={values.customerId && invoicesStatus === 'success'
                    ? <>Open balance: <span className="mono strong">{formatCurrencyExact(customerBalance)}</span></>
                    : undefined}
                >
                  <Dropdown
                    placeholder={isLoadingCustomers ? 'Loading customers…' : 'Select customer...'}
                    disabled={customerOptions.length === 0}
                    value={customer?.name ?? ''}
                    selectedOptions={values.customerId ? [values.customerId] : []}
                    onOptionSelect={(_, data) => { if (data.optionValue) setCustomer(data.optionValue) }}
                  >
                    {customerOptions.map((option) => <Option key={option.id} value={option.id}>{option.name}</Option>)}
                  </Dropdown>
                </Field>

                {values.customerId && (
                  <>
                    {invoicesStatus === 'error' && (
                      <MessageBar intent="warning">
                        <MessageBarBody>{invoicesError}</MessageBarBody>
                        <MessageBarActions>
                          <Button size="small" onClick={retryInvoices}>Retry</Button>
                        </MessageBarActions>
                      </MessageBar>
                    )}
                    <Field
                      label="Against Invoice"
                      required
                      validationState={errorFor('arInvoiceId') ? 'error' : 'none'}
                      validationMessage={errorFor('arInvoiceId')}
                      hint={invoicesStatus === 'success' && invoices.length === 0
                        ? 'This customer has no open invoices. Record the money under Other Party instead.'
                        : undefined}
                    >
                      <Dropdown
                        placeholder={invoicesPlaceholder}
                        disabled={invoices.length === 0}
                        value={invoice ? `${invoice.number} — Balance: ${formatCurrencyExact(invoice.balance)}` : ''}
                        selectedOptions={values.arInvoiceId ? [values.arInvoiceId] : []}
                        onOptionSelect={(_, data) => { if (data.optionValue) setInvoice(data.optionValue) }}
                      >
                        {invoices.map((option) => (
                          <Option key={option.id} value={option.id} text={`${option.number} — Balance: ${formatCurrencyExact(option.balance)}`}>
                            {option.number} — Balance: {formatCurrencyExact(option.balance)}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                  </>
                )}
              </>
            ) : (
              <Field label="Party Name" required validationState={errorFor('payer') ? 'error' : 'none'} validationMessage={errorFor('payer')}>
                <Input
                  value={values.payer}
                  maxLength={MAX_PAYER_LENGTH}
                  placeholder="Enter party name..."
                  onChange={(_, data) => setFields({ payer: data.value })}
                />
              </Field>
            )}
          </div>

          <div className="bank-receipt-form__row bank-receipt-form__row--two">
            <Field label="Amount" required validationState={errorFor('amount') ? 'error' : 'none'} validationMessage={errorFor('amount')}>
              <Input
                className="mono bank-receipt-form__amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={values.amount}
                placeholder="0.00"
                onChange={(_, data) => setFields({ amount: data.value })}
              />
            </Field>
            <Field label="Payment Method" validationState={errorFor('paymentMethod') ? 'error' : 'none'} validationMessage={errorFor('paymentMethod')}>
              <Dropdown
                value={paymentMethodLabel(values.paymentMethod)}
                selectedOptions={[values.paymentMethod]}
                onOptionSelect={(_, data) => { if (isPaymentMethod(data.optionValue)) setFields({ paymentMethod: data.optionValue }) }}
              >
                {paymentMethodOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
              </Dropdown>
            </Field>
          </div>

          {/* RecordArPayment has no description, so only other-party receipts ask for one */}
          {!isCustomer && (
            <Field
              label="Description"
              validationState={errorFor('description') ? 'error' : 'none'}
              validationMessage={errorFor('description')}
              hint={values.description.trim() ? undefined : `Leave blank to use "Receipt from ${values.payer.trim() || '<party>'}".`}
            >
              <Textarea
                rows={2}
                resize="vertical"
                value={values.description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Payment details and notes..."
                onChange={(_, data) => setFields({ description: data.value })}
              />
            </Field>
          )}
        </fieldset>
      </section>

      <aside className="bank-receipts-side">
        <section className="card bank-receipt-summary" aria-label="Amount summary">
          <h3>Amount Summary</h3>
          <div className="bank-receipt-summary__amount">{formatCurrencyExact(summaryAmount)}</div>
          <div className="bank-receipt-summary__method">via {paymentMethodLabel(values.paymentMethod)}</div>
          {isCustomer && invoice && (
            <div className="bank-receipt-summary__note">
              Applied to <span className="mono">{invoice.number}</span>
            </div>
          )}
        </section>

        <section className="card bank-receipt-actions">
          <Button
            type="submit"
            appearance="primary"
            className="bank-receipt-actions__submit"
            disabled={isSaving}
            icon={isSaving ? <Spinner size="tiny" /> : undefined}
          >
            {isSaving ? 'Posting…' : 'Post Receipt'}
          </Button>
        </section>
      </aside>
    </form>
  )
}
