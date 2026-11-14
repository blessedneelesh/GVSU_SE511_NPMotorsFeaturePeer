import { useState, type FormEvent } from 'react'
import {
  Button,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Radio,
  RadioGroup,
  Spinner,
} from '@fluentui/react-components'
import { useSalesInvoiceMutations } from '../../hooks/useSalesInvoiceMutations'
import { useSalesInvoiceOptions } from '../../hooks/useSalesInvoiceOptions'
import type { BankAccount } from '../../types/bankAccounts'
import type {
  SalesInvoiceFieldErrors,
  SalesInvoiceFormField,
  SalesInvoiceFormValues,
  SalesInvoicePaymentTerms,
} from '../../types/salesInvoices'
import type { Vehicle } from '../../types/vehicles'
import { PostSalesInvoiceDialog } from './PostSalesInvoiceDialog'
import { addDaysIso, computeTotals, formatAmount, roundCents, TAX_RATE, todayIso } from './salesInvoiceMetrics'

// Tax and fees aren't typed; they're computed from the vehicle when the form is submitted. The payment terms are a
// radio choice, kept in their own state.
type EditableField = Exclude<SalesInvoiceFormField, 'tax' | 'fees' | 'paymentTerms'>
type EditableValues = Pick<SalesInvoiceFormValues, EditableField>

// The design's Payment Method options, in its order; it starts on Financing (nothing collected now)
const PAYMENT_TERMS: { value: SalesInvoicePaymentTerms; label: string }[] = [
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'financing', label: 'Financing' },
  { value: 'partial', label: 'Partial' },
]
const isPaymentTerms = (value: string): value is SalesInvoicePaymentTerms => PAYMENT_TERMS.some((terms) => terms.value === value)

// The design defaults the due date to a month after the invoice date
const DUE_IN_DAYS = 30
// SalesInvoiceCreateDto's decimal range
const MAX_AMOUNT = 999999999999.99

const REQUIRED_MESSAGES: Partial<Record<EditableField, string>> = {
  customerId: 'Select a customer',
  salespersonId: 'Select a salesperson',
  vehicleId: 'Select a vehicle',
  invoiceDate: 'Invoice date is required',
}

const vehicleLabel = (vehicle: Vehicle) =>
  `${vehicle.title}${vehicle.color ? ` — ${vehicle.color}` : ''} (VIN: ...${vehicle.vin.slice(-6)})`

const accountLabel = (account: BankAccount) =>
  `${[account.bankName, account.name].filter(Boolean).join(' — ')}${account.accountNumber ? ` (${account.accountNumber})` : ''}`

// Drafts and posted invoices need the same fields: the API rejects a draft without customer, salesperson or vehicle
function validate(values: EditableValues, salePrice: number): SalesInvoiceFieldErrors {
  const errors: SalesInvoiceFieldErrors = {}
  for (const [field, message] of Object.entries(REQUIRED_MESSAGES) as [EditableField, string][]) {
    if (!values[field].trim()) errors[field] = message
  }
  if (values.dueDate && values.invoiceDate && values.dueDate < values.invoiceDate) {
    errors.dueDate = "Due date can't be before the invoice date"
  }
  const discount = values.discount.trim()
  if (discount) {
    const amount = Number(discount)
    if (!Number.isFinite(amount) || amount < 0) errors.discount = 'Enter a discount of 0 or more'
    else if (amount > MAX_AMOUNT) errors.discount = 'Discount is too large'
    else if (values.vehicleId && amount > salePrice) errors.discount = "Discount can't exceed the sale price"
  }
  return errors
}

// Posting also records the payment; CreateAndPost's rules: a partial payment is more than zero and less than the
// total, and any amount received needs an account to deposit it to
function validatePayment(values: EditableValues, terms: SalesInvoicePaymentTerms, total: number): SalesInvoiceFieldErrors {
  const errors: SalesInvoiceFieldErrors = {}
  if (terms === 'partial') {
    const amount = Number(values.amountReceived.trim())
    if (!values.amountReceived.trim() || !Number.isFinite(amount) || amount <= 0) errors.amountReceived = 'Enter the amount received'
    else if (amount >= total) errors.amountReceived = 'Partial payment must be less than the invoice total.'
  }
  if (terms !== 'financing' && !values.bankAccountId) errors.bankAccountId = 'Select the account the payment is deposited to'
  return errors
}

interface SalesInvoiceFormProps {
  onClose: () => void
}

// The design's "New Sales Invoice" screen. Mounted only while open, so every opening starts from an empty form
// and reloads the customers, salespeople and vehicles still available for sale.
export function SalesInvoiceForm({ onClose }: SalesInvoiceFormProps) {
  const { saveMode, saveStatus, saveError, fieldErrors, saveDraft, post } = useSalesInvoiceMutations()
  const { options, optionsStatus, optionsError, retry } = useSalesInvoiceOptions()
  const [values, setValues] = useState<EditableValues>(() => ({
    customerId: '',
    salespersonId: '',
    vehicleId: '',
    invoiceDate: todayIso(),
    dueDate: addDaysIso(DUE_IN_DAYS),
    discount: '',
    amountReceived: '',
    bankAccountId: '',
  }))
  const [paymentTerms, setPaymentTerms] = useState<SalesInvoicePaymentTerms>('financing')
  const [clientErrors, setClientErrors] = useState<SalesInvoiceFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<SalesInvoiceFormField>>(new Set())
  const [isConfirmOpen, setConfirmOpen] = useState(false)

  const isSaving = saveStatus === 'loading'
  const optionsLoading = optionsStatus === 'loading' || optionsStatus === 'idle'
  const activeCustomers = options.customers.filter((customer) => customer.status === 'Active')
  const customer = options.customers.find((item) => item.id === values.customerId)
  const vehicle = options.vehicles.find((item) => item.id === values.vehicleId)

  // The API prices the invoice at the vehicle's selling price; the form shows the same figures before saving.
  // The discount is rounded to cents as it's sent, so a paid-in-full amount matches the API's total exactly.
  const salePrice = vehicle?.sellingPrice ?? 0
  const discount = Number(values.discount) > 0 ? roundCents(Number(values.discount)) : 0
  const totals = computeTotals(salePrice, discount)
  const cogs = vehicle?.totalCost ?? 0
  const profit = totals.subtotal - cogs

  const partialAmount = Number(values.amountReceived) > 0 ? roundCents(Number(values.amountReceived)) : 0
  const amountPaid =
    paymentTerms === 'bank' || paymentTerms === 'cash' ? totals.total
      : paymentTerms === 'partial' ? Math.min(partialAmount, totals.total)
        : 0
  const balance = Math.max(0, roundCents(totals.total - amountPaid))
  const needsDepositAccount = paymentTerms !== 'financing'

  const errorFor = (field: SalesInvoiceFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])
  // Tax and fees have no input, so their server errors go in the banner
  const bannerError = saveError ?? fieldErrors.tax ?? fieldErrors.fees

  const setField = (field: EditableField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setClientErrors((current) => ({ ...current, [field]: undefined }))
    setEditedFields((current) => new Set(current).add(field))
  }

  const changePaymentTerms = (value: string) => {
    if (!isPaymentTerms(value)) return
    setPaymentTerms(value)
    setClientErrors((current) => ({ ...current, amountReceived: undefined, bankAccountId: undefined }))
    setEditedFields((current) => new Set(current).add('amountReceived').add('bankAccountId'))
  }

  const toFormValues = (): SalesInvoiceFormValues => ({
    ...values,
    tax: totals.tax.toFixed(2),
    fees: totals.fees.toFixed(2),
    paymentTerms,
    amountReceived: amountPaid.toFixed(2),
    bankAccountId: needsDepositAccount ? values.bankAccountId : '',
  })

  // Returns true when the form can be sent; a draft records no payment, so only posting checks it
  const check = (withPayment: boolean) => {
    const errors = { ...validate(values, salePrice), ...(withPayment ? validatePayment(values, paymentTerms, totals.total) : {}) }
    setClientErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveDraft = (event: FormEvent) => {
    event.preventDefault()
    if (!check(false)) return
    setEditedFields(new Set())
    saveDraft(toFormValues())
  }

  const handlePost = () => {
    if (check(true)) setConfirmOpen(true)
  }

  const confirmPost = () => {
    setConfirmOpen(false)
    setEditedFields(new Set())
    post(toFormValues())
  }

  const dropdownField = (
    field: EditableField,
    label: string,
    placeholder: string,
    items: { id: string; label: string }[],
  ) => {
    const selected = items.find((item) => item.id === values[field])
    return (
      <Field label={label} required validationState={errorFor(field) ? 'error' : 'none'} validationMessage={errorFor(field)}>
        <Dropdown
          placeholder={optionsLoading ? 'Loading…' : placeholder}
          disabled={optionsLoading || optionsStatus === 'error'}
          value={selected?.label ?? ''}
          selectedOptions={selected ? [selected.id] : []}
          onOptionSelect={(_, data) => { if (data.optionValue) setField(field, data.optionValue) }}
        >
          {items.map((item) => <Option key={item.id} value={item.id}>{item.label}</Option>)}
        </Dropdown>
      </Field>
    )
  }

  return (
    <div className="sales-invoices-page">
      <nav className="sales-invoices-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" disabled={isSaving} onClick={onClose}>← Sales Invoices</button>
        <span aria-hidden="true">/</span>
        <strong>New Sales Invoice</strong>
      </nav>

      <MessageBar intent="info" className="sales-invoices-message">
        <MessageBarBody>
          Posting this invoice will automatically create: <strong>Revenue entry</strong>, <strong>COGS entry</strong>,
          and update <strong>Vehicle Inventory</strong>.
        </MessageBarBody>
      </MessageBar>

      {optionsStatus === 'error' && (
        <MessageBar intent="error" className="sales-invoices-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load the form&apos;s lists</MessageBarTitle>
            {optionsError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {bannerError && (
        <MessageBar intent="error" className="sales-invoices-message">
          <MessageBarBody>
            <MessageBarTitle>{saveMode === 'post' ? "Couldn't post invoice" : "Couldn't save draft"}</MessageBarTitle>
            {bannerError}
          </MessageBarBody>
        </MessageBar>
      )}

      <form onSubmit={handleSaveDraft} noValidate>
        <div className="sales-invoice-form">
          <fieldset className="card sales-invoice-form__details" disabled={isSaving}>
            <legend className="sales-invoice-form__title">Invoice Details</legend>

            <div className="form-grid form-grid--3">
              <Field label="Invoice Number" hint="Assigned when saved">
                <Input readOnly value="" placeholder="Auto-generated" className="readonly-input" />
              </Field>
              <Field label="Invoice Date" required validationState={errorFor('invoiceDate') ? 'error' : 'none'} validationMessage={errorFor('invoiceDate')}>
                <Input type="date" value={values.invoiceDate} onChange={(_, data) => setField('invoiceDate', data.value)} />
              </Field>
              <Field label="Due Date" validationState={errorFor('dueDate') ? 'error' : 'none'} validationMessage={errorFor('dueDate')}>
                <Input type="date" value={values.dueDate} min={values.invoiceDate || undefined} onChange={(_, data) => setField('dueDate', data.value)} />
              </Field>
            </div>

            <div className="form-grid form-grid--2">
              {dropdownField('customerId', 'Customer', 'Select customer...', activeCustomers.map((item) => ({ id: item.id, label: item.fullName })))}
              {dropdownField('salespersonId', 'Salesperson', 'Select salesperson...', options.salespeople.map((item) => ({ id: item.id, label: item.fullName })))}
            </div>

            <div>
              {dropdownField(
                'vehicleId',
                'Vehicle',
                options.vehicles.length || optionsLoading ? 'Select available vehicle...' : 'No vehicles available for sale',
                options.vehicles.map((item) => ({ id: item.id, label: vehicleLabel(item) })),
              )}
              {vehicle && <div className="sales-invoice-form__vin mono">VIN: {vehicle.vin}</div>}
            </div>

            <div className="form-grid form-grid--2">
              <Field label="Sale Price" hint="The vehicle's selling price">
                <Input readOnly className="readonly-input mono" value={vehicle ? salePrice.toFixed(2) : ''} placeholder="0.00" />
              </Field>
              <Field label="Discount" validationState={errorFor('discount') ? 'error' : 'none'} validationMessage={errorFor('discount')}>
                <Input
                  type="number"
                  className="mono"
                  min={0}
                  step="0.01"
                  value={values.discount}
                  placeholder="0.00"
                  onChange={(_, data) => setField('discount', data.value)}
                />
              </Field>
            </div>

            <Field label="Payment Method" hint={paymentTerms === 'financing' ? 'Nothing is collected now; the balance goes to Accounts Receivable' : undefined}>
              <RadioGroup
                layout="horizontal"
                className="payment-terms"
                value={paymentTerms}
                onChange={(_, data) => changePaymentTerms(data.value)}
              >
                {PAYMENT_TERMS.map((terms) => (
                  <Radio key={terms.value} value={terms.value} label={terms.label} className="payment-terms__option" />
                ))}
              </RadioGroup>
            </Field>

            {paymentTerms === 'partial' && (
              <Field label="Amount Received" required validationState={errorFor('amountReceived') ? 'error' : 'none'} validationMessage={errorFor('amountReceived')}>
                <Input
                  type="number"
                  className="mono"
                  min={0}
                  step="0.01"
                  value={values.amountReceived}
                  placeholder="0.00"
                  onChange={(_, data) => setField('amountReceived', data.value)}
                />
              </Field>
            )}

            {needsDepositAccount &&
              dropdownField(
                'bankAccountId',
                'Deposit To',
                options.bankAccounts.length || optionsLoading ? 'Select account...' : 'No active bank accounts',
                options.bankAccounts.map((item) => ({ id: item.id, label: accountLabel(item) })),
              )}
          </fieldset>

          <aside className="sales-invoice-form__aside">
            <section className="card summary-card">
              <h3>Invoice Summary</h3>
              <dl className="summary-list">
                <div><dt>Sale Price</dt><dd>{formatAmount(salePrice)}</dd></div>
                <div><dt>Discount</dt><dd className="text-red">-{formatAmount(discount)}</dd></div>
                <div className="summary-list__rule"><dt>Subtotal</dt><dd>{formatAmount(totals.subtotal)}</dd></div>
                <div><dt>Tax ({TAX_RATE * 100}%)</dt><dd>{formatAmount(totals.tax)}</dd></div>
                <div><dt>Fees</dt><dd>{formatAmount(totals.fees)}</dd></div>
                <div className="summary-list__total"><dt>Total</dt><dd className="text-blue">{formatAmount(totals.total)}</dd></div>
                <div><dt>Paid on Invoice</dt><dd className="text-green">{formatAmount(amountPaid)}</dd></div>
                <div className="summary-list__strong"><dt>Balance Due</dt><dd className="text-amber">{formatAmount(balance)}</dd></div>
              </dl>
            </section>

            {vehicle && (
              <section className="card summary-card summary-card--green">
                <h3>Profitability</h3>
                <dl className="summary-list">
                  <div><dt>Sale Price</dt><dd>{formatAmount(salePrice)}</dd></div>
                  <div><dt>Cost of Vehicle</dt><dd className="text-red">-{formatAmount(cogs)}</dd></div>
                  <div className="summary-list__rule summary-list__strong">
                    <dt>Gross Profit</dt>
                    <dd className={profit >= 0 ? 'text-green' : 'text-red'}>{formatAmount(profit)}</dd>
                  </div>
                  {salePrice > 0 && (
                    <div className="summary-list__small">
                      <dt>Margin</dt>
                      <dd className={profit >= 0 ? 'text-green' : 'text-red'}>{((profit / salePrice) * 100).toFixed(1)}%</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {vehicle && customer && (
              <section className="card summary-card summary-card--blue">
                <h3>Accounting Entries (Auto)</h3>
                <dl className="summary-list summary-list--compact">
                  <div className="summary-list__heading"><dt>On Posting:</dt></div>
                  <div><dt>Accounts Receivable Dr</dt><dd>{formatAmount(totals.total)}</dd></div>
                  <div><dt>Vehicle Sales Cr</dt><dd>{formatAmount(salePrice)}</dd></div>
                  <div><dt>Sales Tax Payable Cr</dt><dd>{formatAmount(totals.tax)}</dd></div>
                  <div className="summary-list__heading summary-list__rule"><dt>COGS Entry:</dt></div>
                  <div><dt>Cost of Vehicles Sold Dr</dt><dd>{formatAmount(cogs)}</dd></div>
                  <div><dt>Vehicle Inventory Cr</dt><dd>{formatAmount(cogs)}</dd></div>
                </dl>
              </section>
            )}
          </aside>
        </div>

        <div className="sales-invoice-form__actions">
          <Button type="submit" disabled={isSaving} icon={isSaving && saveMode === 'draft' ? <Spinner size="tiny" /> : undefined}>
            {isSaving && saveMode === 'draft' ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button appearance="primary" disabled={isSaving} onClick={handlePost} icon={isSaving && saveMode === 'post' ? <Spinner size="tiny" /> : undefined}>
            {isSaving && saveMode === 'post' ? 'Posting…' : 'Post Invoice'}
          </Button>
          <Button className="sales-invoice-form__cancel" disabled={isSaving} onClick={onClose}>Cancel</Button>
        </div>
      </form>

      {isConfirmOpen && (
        <PostSalesInvoiceDialog
          customerName={customer?.fullName ?? ''}
          vehicle={vehicle?.title ?? ''}
          total={totals.total}
          amountReceived={amountPaid}
          onConfirm={confirmPost}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}
