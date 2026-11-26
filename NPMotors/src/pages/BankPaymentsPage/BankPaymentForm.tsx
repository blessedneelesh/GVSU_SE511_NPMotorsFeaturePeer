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
import { usePayableMutations } from '../../hooks/usePayableMutations'
import { usePayableVendorOptions } from '../../hooks/usePayableVendorOptions'
import { usePaymentVendorBills } from '../../hooks/usePaymentVendorBills'
import { useReceiptBankAccountOptions } from '../../hooks/useReceiptBankAccountOptions'
import type { PaymentMethod } from '../../types/common'
import type {
  BankPaymentFormField,
  BankPaymentFormValues,
  Payable,
  PaymentPayeeType,
  VendorPaymentFieldErrors,
  VendorPaymentFormValues,
} from '../../types/payables'
import type { ReceiptBankAccountOption } from '../../types/receipts'
import {
  bankAccountLabel,
  formatCurrencyExact,
  paymentCategoryLabel,
  paymentCategoryOptions,
  paymentMethodLabel,
  paymentMethodOptions,
  type PostedBankPayment,
  todayIsoDate,
  toCents,
} from './bankPaymentMetrics'

// "Employee" from the design is left out: salaries are paid elsewhere
const payeeOptions: { value: PaymentPayeeType; label: string }[] = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'other', label: 'Other Party' },
]

const isPayeeType = (value: unknown): value is PaymentPayeeType => payeeOptions.some((option) => option.value === value)
const isPaymentMethod = (value: unknown): value is PaymentMethod => paymentMethodOptions.some((option) => option.value === value)

const EXCEEDS_BALANCE_MESSAGE = 'Amount exceeds the available account balance.'
const EXCEEDS_BILL_MESSAGE = 'Amount exceeds the selected bill balance.'
// MiscellaneousPaymentCreateDto / VendorPaymentCreateDto limits
const MAX_REFERENCE_LENGTH = 100
const MAX_PAYEE_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 200
const MAX_AMOUNT = 999999999999.99

const emptyForm = (): BankPaymentFormValues => ({
  paymentDate: todayIsoDate(),
  amount: '',
  // The design's first method
  paymentMethod: 'check',
  bankAccountId: '',
  reference: '',
  payeeType: 'vendor',
  vendorId: '',
  apBillId: '',
  payee: '',
  paymentCategory: '',
  description: '',
})

// The amount can't overdraw the account (as in the design) or, for a vendor, overpay the bill
function amountLimitError(amount: number, account: ReceiptBankAccountOption | undefined, bill: Payable | undefined): string | undefined {
  if (!(amount > 0)) return undefined
  if (account && toCents(amount) > toCents(account.bookBalance)) return EXCEEDS_BALANCE_MESSAGE
  if (bill && toCents(amount) > toCents(bill.balance)) return EXCEEDS_BILL_MESSAGE
  return undefined
}

// Required fields follow the design, plus a bill for vendors: RecordVendorPayment always posts against one
function validate(values: BankPaymentFormValues, account: ReceiptBankAccountOption | undefined, bill: Payable | undefined): VendorPaymentFieldErrors {
  const errors: VendorPaymentFieldErrors = {}
  if (!values.paymentDate) errors.paymentDate = 'Payment date is required'
  if (!values.bankAccountId) errors.bankAccountId = 'Select the account to pay from'
  if (values.payeeType === 'vendor') {
    if (!values.vendorId) errors.vendorId = 'Select the vendor being paid'
    else if (!values.apBillId) errors.apBillId = 'Select the bill this payment is for'
  } else {
    if (!values.payee.trim()) errors.payee = 'Enter who the money was paid to'
    if (!values.paymentCategory) errors.paymentCategory = 'Select the account to debit'
  }

  const amountText = values.amount.trim()
  const amount = Number(amountText)
  if (!amountText) errors.amount = 'Amount is required'
  else if (!Number.isFinite(amount)) errors.amount = 'Enter a valid amount'
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero'
  else if (amount > MAX_AMOUNT) errors.amount = 'Amount is too large'
  else if (!/^\d+(\.\d{1,2})?$/.test(amountText)) errors.amount = 'Use at most two decimal places'
  else {
    const limit = amountLimitError(amount, account, bill)
    if (limit) errors.amount = limit
  }
  return errors
}

interface BankPaymentFormProps {
  // Called with what is being posted, just before it is sent; the page shows it once the post succeeds
  onSubmit: (posted: PostedBankPayment) => void
}

// The Bank Payment card and its summary. "Paid To" decides the endpoint: a vendor payment goes to RecordVendorPayment
// against the chosen bill, anything else to RecordMiscellaneousPayment.
export function BankPaymentForm({ onSubmit }: BankPaymentFormProps) {
  const { saveStatus, saveError, fieldErrors, recordPayment, recordMisc } = usePayableMutations()
  const { bankAccountOptions, bankAccountOptionsStatus, bankAccountOptionsError, retry: retryAccounts } = useReceiptBankAccountOptions()
  const { vendorOptions, vendorOptionsStatus, vendorOptionsError, retry: retryVendors } = usePayableVendorOptions()
  const [values, setValues] = useState<BankPaymentFormValues>(emptyForm)
  const { bills, billsStatus, billsError, retry: retryBills } = usePaymentVendorBills(values.payeeType === 'vendor' ? values.vendorId : '')
  const [clientErrors, setClientErrors] = useState<VendorPaymentFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<BankPaymentFormField>>(new Set())
  const isSaving = saveStatus === 'loading'
  const isVendor = values.payeeType === 'vendor'

  const bankAccount = bankAccountOptions.find((option) => option.id === values.bankAccountId)
  const vendor = vendorOptions.find((option) => option.id === values.vendorId)
  const bill = isVendor ? bills.find((option) => option.id === values.apBillId) : undefined
  const category = paymentCategoryOptions.find((option) => option.name === values.paymentCategory)
  const vendorBalance = bills.reduce((sum, option) => sum + option.balance, 0)
  const amount = Number(values.amount)
  const summaryAmount = Number.isFinite(amount) && amount > 0 ? amount : 0
  const isLoadingAccounts = (bankAccountOptionsStatus === 'loading' || bankAccountOptionsStatus === 'idle') && bankAccountOptions.length === 0
  const isLoadingVendors = (vendorOptionsStatus === 'loading' || vendorOptionsStatus === 'idle') && vendorOptions.length === 0

  // Shown while typing, like the design; everything else waits for submit
  const liveErrors: VendorPaymentFieldErrors = { amount: amountLimitError(amount, bankAccount, bill) }

  const errorFor = (field: BankPaymentFormField) =>
    clientErrors[field] ?? liveErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setFields = (changes: Partial<BankPaymentFormValues>) => {
    const fields = Object.keys(changes) as BankPaymentFormField[]
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

  // Switching payee type or vendor drops the bill picked for the previous one
  const setPayeeType = (payeeType: PaymentPayeeType) => setFields({ payeeType, apBillId: '' })
  const setVendor = (vendorId: string) => setFields({ vendorId, apBillId: '' })
  // Picking a bill offers its full balance until the user types an amount
  const setBill = (apBillId: string) => {
    const picked = bills.find((option) => option.id === apBillId)
    setFields(picked && !values.amount.trim() ? { apBillId, amount: String(picked.balance) } : { apBillId })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validate(values, bankAccount, bill)
    setClientErrors(errors)
    if (Object.keys(errors).length) return
    setEditedFields(new Set())

    const payment: VendorPaymentFormValues = {
      paymentDate: values.paymentDate,
      amount: values.amount.trim(),
      paymentMethod: values.paymentMethod,
      bankAccountId: values.bankAccountId,
      reference: values.reference,
    }
    onSubmit({
      amount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      bankAccountName: bankAccount ? bankAccountLabel(bankAccount) : '',
      balanceBefore: bankAccount ? bankAccount.bookBalance : null,
      payeeName: isVendor ? (vendor?.name ?? '') : values.payee.trim(),
      billNumber: isVendor ? (bill?.number ?? '') : '',
      paymentCategory: isVendor ? '' : values.paymentCategory,
      reference: payment.reference.trim(),
    })
    if (isVendor) recordPayment(values.apBillId, payment)
    else recordMisc({ payee: values.payee, paymentCategory: values.paymentCategory, description: values.description, values: payment })
  }

  const billsPlaceholder = billsStatus === 'loading' && bills.length === 0
    ? 'Loading bills…'
    : bills.length === 0 ? 'No open bills' : 'Select a bill'
  const billLabel = (option: Payable) => `${option.number} — Balance: ${formatCurrencyExact(option.balance)}`

  return (
    <form className="bank-payments-grid" onSubmit={handleSubmit} noValidate aria-label="Bank payment">
      <section className="card bank-payment-form">
        {saveError && (
          <MessageBar intent="error" className="bank-payment-form__message">
            <MessageBarBody>{saveError}</MessageBarBody>
          </MessageBar>
        )}

        <fieldset className="bank-payment-form__fields" disabled={isSaving}>
          <div className="bank-payment-form__row">
            <Field label="Date" required validationState={errorFor('paymentDate') ? 'error' : 'none'} validationMessage={errorFor('paymentDate')}>
              <Input type="date" value={values.paymentDate} onChange={(_, data) => setFields({ paymentDate: data.value })} />
            </Field>
            <Field label="Reference" validationState={errorFor('reference') ? 'error' : 'none'} validationMessage={errorFor('reference')}>
              <Input
                value={values.reference}
                maxLength={MAX_REFERENCE_LENGTH}
                placeholder="Check #, wire ref..."
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
              ? <>Available balance: <span className="mono strong text-green">{formatCurrencyExact(bankAccount.bookBalance)}</span></>
              : bankAccountOptionsStatus === 'success' && bankAccountOptions.length === 0 ? 'There are no active bank accounts to pay from.' : undefined}
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

          <div className="bank-payment-form__party">
            <Field label="Paid To">
              <RadioGroup
                layout="horizontal"
                value={values.payeeType}
                onChange={(_, data) => { if (isPayeeType(data.value)) setPayeeType(data.value) }}
              >
                {payeeOptions.map((option) => <Radio key={option.value} value={option.value} label={option.label} />)}
              </RadioGroup>
            </Field>

            {isVendor ? (
              <>
                {vendorOptionsStatus === 'error' && (
                  <MessageBar intent="warning">
                    <MessageBarBody>{vendorOptionsError}</MessageBarBody>
                    <MessageBarActions>
                      <Button size="small" onClick={retryVendors}>Retry</Button>
                    </MessageBarActions>
                  </MessageBar>
                )}
                <Field
                  label="Vendor"
                  required
                  validationState={errorFor('vendorId') ? 'error' : 'none'}
                  validationMessage={errorFor('vendorId')}
                  hint={values.vendorId && billsStatus === 'success'
                    ? <>Open balance: <span className="mono strong">{formatCurrencyExact(vendorBalance)}</span></>
                    : undefined}
                >
                  <Dropdown
                    placeholder={isLoadingVendors ? 'Loading vendors…' : 'Select vendor...'}
                    disabled={vendorOptions.length === 0}
                    value={vendor?.name ?? ''}
                    selectedOptions={values.vendorId ? [values.vendorId] : []}
                    onOptionSelect={(_, data) => { if (data.optionValue) setVendor(data.optionValue) }}
                  >
                    {vendorOptions.map((option) => <Option key={option.id} value={option.id}>{option.name}</Option>)}
                  </Dropdown>
                </Field>

                {values.vendorId && (
                  <>
                    {billsStatus === 'error' && (
                      <MessageBar intent="warning">
                        <MessageBarBody>{billsError}</MessageBarBody>
                        <MessageBarActions>
                          <Button size="small" onClick={retryBills}>Retry</Button>
                        </MessageBarActions>
                      </MessageBar>
                    )}
                    <Field
                      label="Against AP Bill"
                      required
                      validationState={errorFor('apBillId') ? 'error' : 'none'}
                      validationMessage={errorFor('apBillId')}
                      hint={billsStatus === 'success' && bills.length === 0
                        ? 'This vendor has no open bills. Record the payment under Other Party instead.'
                        : undefined}
                    >
                      <Dropdown
                        placeholder={billsPlaceholder}
                        disabled={bills.length === 0}
                        value={bill ? billLabel(bill) : ''}
                        selectedOptions={values.apBillId ? [values.apBillId] : []}
                        onOptionSelect={(_, data) => { if (data.optionValue) setBill(data.optionValue) }}
                      >
                        {bills.map((option) => <Option key={option.id} value={option.id} text={billLabel(option)}>{billLabel(option)}</Option>)}
                      </Dropdown>
                    </Field>
                  </>
                )}
              </>
            ) : (
              <Field label="Payee Name" required validationState={errorFor('payee') ? 'error' : 'none'} validationMessage={errorFor('payee')}>
                <Input
                  value={values.payee}
                  maxLength={MAX_PAYEE_LENGTH}
                  placeholder="Enter payee name..."
                  onChange={(_, data) => setFields({ payee: data.value })}
                />
              </Field>
            )}
          </div>

          {/* RecordVendorPayment always debits Accounts Payable, so only other-party payments pick an account */}
          {!isVendor && (
            <Field
              label="Payment Purpose / Debit Account"
              required
              validationState={errorFor('paymentCategory') ? 'error' : 'none'}
              validationMessage={errorFor('paymentCategory')}
            >
              <Dropdown
                placeholder="Select account to debit..."
                value={category ? paymentCategoryLabel(category) : ''}
                selectedOptions={values.paymentCategory ? [values.paymentCategory] : []}
                onOptionSelect={(_, data) => { if (data.optionValue) setFields({ paymentCategory: data.optionValue }) }}
              >
                {paymentCategoryOptions.map((option) => (
                  <Option key={option.code} value={option.name} text={paymentCategoryLabel(option)}>{paymentCategoryLabel(option)}</Option>
                ))}
              </Dropdown>
            </Field>
          )}

          <div className="bank-payment-form__row">
            <Field label="Amount" required validationState={errorFor('amount') ? 'error' : 'none'} validationMessage={errorFor('amount')}>
              <Input
                className="mono bank-payment-form__amount"
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

          {/* RecordVendorPayment has no description, so only other-party payments ask for one */}
          {!isVendor && (
            <Field
              label="Description"
              validationState={errorFor('description') ? 'error' : 'none'}
              validationMessage={errorFor('description')}
              hint={values.description.trim() ? undefined : `Leave blank to use "Payment to ${values.payee.trim() || '<payee>'}".`}
            >
              <Textarea
                rows={2}
                resize="vertical"
                value={values.description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Payment purpose and details..."
                onChange={(_, data) => setFields({ description: data.value })}
              />
            </Field>
          )}
        </fieldset>
      </section>

      <aside className="bank-payments-side">
        <section className="card bank-payment-summary" aria-label="Payment amount">
          <h3>Payment Amount</h3>
          <div className="bank-payment-summary__amount">{summaryAmount > 0 ? `-${formatCurrencyExact(summaryAmount)}` : formatCurrencyExact(0)}</div>
          {bankAccount && summaryAmount > 0 && (
            <div className="bank-payment-summary__note">
              New balance: <span className="mono">{formatCurrencyExact((toCents(bankAccount.bookBalance) - toCents(summaryAmount)) / 100)}</span>
            </div>
          )}
          {bill && (
            <div className="bank-payment-summary__note">
              Applied to <span className="mono">{bill.number}</span>
            </div>
          )}
        </section>

        <section className="card bank-payment-actions">
          <Button
            type="submit"
            appearance="primary"
            className="bank-payment-actions__submit"
            disabled={isSaving}
            icon={isSaving ? <Spinner size="tiny" /> : undefined}
          >
            {isSaving ? 'Posting…' : 'Post Payment'}
          </Button>
        </section>
      </aside>
    </form>
  )
}
