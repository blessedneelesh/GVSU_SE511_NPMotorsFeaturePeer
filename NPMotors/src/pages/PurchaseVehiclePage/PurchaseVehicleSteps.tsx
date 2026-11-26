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
} from '@fluentui/react-components'
import { additionalCostCents, amountPaidCents, toCents, totalCostCents } from '../../services/vehicles/vehicles.mappers'
import type { RequestStatus } from '../../types/common'
import type {
  VehicleBankAccountOption,
  VehiclePurchaseFormField,
  VehiclePurchaseFormValues,
  VehicleVendorOption,
} from '../../types/vehicles'
import {
  bankAccountLabel,
  formatAmount,
  isPaymentCondition,
  isPaymentMethod,
  MAX_YEAR,
  MIN_YEAR,
  PAYMENT_CONDITION_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  paymentConditionLabel,
  paymentMethodLabel,
  WAREHOUSE_OPTIONS,
} from './purchaseVehicleForm'

// What every step needs to read and edit the wizard's values
interface StepProps {
  values: VehiclePurchaseFormValues
  errorFor: (field: VehiclePurchaseFormField) => string | undefined
  setField: SetPurchaseField
}

export type SetPurchaseField = <Field extends VehiclePurchaseFormField>(field: Field, value: VehiclePurchaseFormValues[Field]) => void

interface OptionsState<T> {
  options: T[]
  status: RequestStatus
  error: string | null
  retry: () => void
}

type TextField = 'purchaseDate' | 'make' | 'model' | 'year' | 'color' | 'vin' | 'purchasePrice' | 'salesTax' | 'transportCost'
  | 'otherCosts' | 'sellingPrice' | 'amountPaid' | 'reference' | 'dueDate'

interface TextFieldOptions {
  required?: boolean
  type?: 'number' | 'date'
  placeholder?: string
  maxLength?: number
  min?: number
  max?: number
  mono?: boolean
  hint?: string
}

function TextInputField({ field, label, options = {}, values, errorFor, setField }: StepProps & { field: TextField; label: string; options?: TextFieldOptions }) {
  const error = errorFor(field)
  return (
    <Field label={label} required={options.required} hint={options.hint} validationState={error ? 'error' : 'none'} validationMessage={error}>
      <Input
        className={options.mono ? 'mono' : undefined}
        type={options.type}
        min={options.min}
        max={options.max}
        step={options.type === 'number' && options.min === 0 ? 0.01 : undefined}
        value={values[field]}
        maxLength={options.maxLength}
        placeholder={options.placeholder}
        onChange={(_, data) => setField(field, data.value)}
      />
    </Field>
  )
}

// A money input: two decimals, never negative
const money = (placeholder = '0.00'): TextFieldOptions => ({ type: 'number', min: 0, placeholder, mono: true })

function OptionsWarning({ status, error, retry }: Omit<OptionsState<unknown>, 'options'>) {
  if (status !== 'error') return null
  return (
    <MessageBar intent="warning">
      <MessageBarBody>{error}</MessageBarBody>
      <MessageBarActions>
        <Button size="small" onClick={retry}>Retry</Button>
      </MessageBarActions>
    </MessageBar>
  )
}

// A reload keeps the previous options, so only an empty list blocks the dropdown
const isLoadingOptions = ({ status, options }: OptionsState<unknown>) => (status === 'loading' || status === 'idle') && options.length === 0

/* ── Step 1: Vehicle Information ─────────────────────────────────────────── */

export function VehicleInfoStep({ vendors, ...props }: StepProps & { vendors: OptionsState<VehicleVendorOption> }) {
  const { values, errorFor, setField } = props
  const loadingVendors = isLoadingOptions(vendors)
  const vendorName = vendors.options.find((option) => option.id === values.vendorId)?.name ?? ''

  return (
    <>
      <h2 className="purchase-card__title">Vehicle Information</h2>
      <OptionsWarning {...vendors} />
      <Field label="Vendor / Seller" required validationState={errorFor('vendorId') ? 'error' : 'none'} validationMessage={errorFor('vendorId')}>
        <Dropdown
          value={vendorName}
          selectedOptions={values.vendorId ? [values.vendorId] : []}
          placeholder={loadingVendors ? 'Loading vendors…' : vendors.options.length ? 'Select vendor…' : 'No vehicle vendors'}
          disabled={loadingVendors || vendors.status === 'error'}
          onOptionSelect={(_, data) => { if (data.optionValue) setField('vendorId', data.optionValue) }}
        >
          {vendors.options.map((option) => <Option key={option.id} value={option.id}>{option.name}</Option>)}
        </Dropdown>
      </Field>
      <TextInputField {...props} field="purchaseDate" label="Purchase Date" options={{ type: 'date', required: true }} />
      <div className="form-grid form-grid--3">
        <TextInputField {...props} field="make" label="Make" options={{ required: true, placeholder: 'Toyota', maxLength: 50 }} />
        <TextInputField {...props} field="model" label="Model" options={{ required: true, placeholder: 'Camry', maxLength: 50 }} />
        <TextInputField {...props} field="year" label="Year" options={{ required: true, type: 'number', placeholder: String(MAX_YEAR - 1), min: MIN_YEAR, max: MAX_YEAR }} />
      </div>
      <div className="form-grid form-grid--2">
        <TextInputField {...props} field="color" label="Color" options={{ placeholder: 'Silver', maxLength: 30 }} />
        <Field label="Warehouse">
          <Dropdown
            value={values.warehouse}
            selectedOptions={values.warehouse ? [values.warehouse] : []}
            onOptionSelect={(_, data) => { if (data.optionValue) setField('warehouse', data.optionValue) }}
          >
            {WAREHOUSE_OPTIONS.map((warehouse) => <Option key={warehouse} value={warehouse}>{warehouse}</Option>)}
          </Dropdown>
        </Field>
      </div>
      <TextInputField {...props} field="vin" label="VIN Number" options={{ required: true, placeholder: '1HGCR2F3XEA000000', maxLength: 17, mono: true }} />
    </>
  )
}

/* ── Step 2: Acquisition Costs ───────────────────────────────────────────── */

export function CostsStep(props: StepProps) {
  const { values } = props
  const rows: [string, number][] = [
    ['Purchase Price', toCents(values.purchasePrice)],
    ['Transportation', toCents(values.transportCost)],
    ['Taxes', toCents(values.salesTax)],
    ['Other Costs', toCents(values.otherCosts)],
  ]

  return (
    <>
      <h2 className="purchase-card__title">Acquisition Costs</h2>
      <div className="form-grid form-grid--2">
        <TextInputField {...props} field="purchasePrice" label="Purchase Price" options={{ ...money(), required: true }} />
        <TextInputField {...props} field="salesTax" label="Sales Tax" options={money()} />
        <TextInputField {...props} field="transportCost" label="Transportation / Shipping" options={money()} />
        <TextInputField {...props} field="otherCosts" label="Other Acquisition Costs" options={money()} />
        <TextInputField
          {...props}
          field="sellingPrice"
          label="List Price"
          options={{ ...money(), hint: 'The asking price shown in inventory; optional' }}
        />
      </div>
      <div className="purchase-breakdown" aria-live="polite">
        <div className="purchase-breakdown__title">Total Vehicle Cost Breakdown</div>
        {rows.map(([label, cents]) => (
          <div key={label} className="purchase-breakdown__row">
            <span>{label}</span>
            <span className="mono">{formatAmount(cents / 100)}</span>
          </div>
        ))}
        <div className="purchase-breakdown__row purchase-breakdown__row--total">
          <span>Total Cost</span>
          <span className="mono">{formatAmount(totalCostCents(values) / 100)}</span>
        </div>
      </div>
    </>
  )
}

/* ── Step 3: Payment Method ──────────────────────────────────────────────── */

export function PaymentStep({ bankAccounts, ...props }: StepProps & { bankAccounts: OptionsState<VehicleBankAccountOption> }) {
  const { values, errorFor, setField } = props
  const paysNow = values.paymentCondition !== 'credit'
  const leavesBalance = values.paymentCondition !== 'paidInFull'
  const loadingAccounts = isLoadingOptions(bankAccounts)
  const account = bankAccounts.options.find((option) => option.id === values.bankAccountId)
  const methodLabel = paymentMethodLabel(values.paymentMethod)
  const totalCents = totalCostCents(values)
  const paidCents = Math.min(amountPaidCents(values), totalCents)

  return (
    <>
      <h2 className="purchase-card__title">Payment Method</h2>
      <RadioGroup
        layout="horizontal"
        className="purchase-payment-options"
        aria-label="Payment method"
        value={values.paymentCondition}
        onChange={(_, data) => { if (isPaymentCondition(data.value)) setField('paymentCondition', data.value) }}
      >
        {PAYMENT_CONDITION_OPTIONS.map((option) => (
          <Radio key={option.value} value={option.value} label={option.label} className="purchase-payment-options__option" />
        ))}
      </RadioGroup>

      {paysNow && (
        <>
          <OptionsWarning {...bankAccounts} />
          <Field label="Bank Account" required validationState={errorFor('bankAccountId') ? 'error' : 'none'} validationMessage={errorFor('bankAccountId')}>
            <Dropdown
              value={account ? bankAccountLabel(account) : ''}
              selectedOptions={values.bankAccountId ? [values.bankAccountId] : []}
              placeholder={loadingAccounts ? 'Loading bank accounts…' : bankAccounts.options.length ? 'Select bank account…' : 'No active bank accounts'}
              disabled={loadingAccounts || bankAccounts.status === 'error'}
              onOptionSelect={(_, data) => { if (data.optionValue) setField('bankAccountId', data.optionValue) }}
            >
              {bankAccounts.options.map((option) => <Option key={option.id} value={option.id}>{bankAccountLabel(option)}</Option>)}
            </Dropdown>
          </Field>
          <div className="form-grid form-grid--2">
            <Field label="Paid By" required validationState={errorFor('paymentMethod') ? 'error' : 'none'} validationMessage={errorFor('paymentMethod')}>
              <Dropdown
                value={methodLabel}
                selectedOptions={[values.paymentMethod]}
                onOptionSelect={(_, data) => { if (isPaymentMethod(data.optionValue)) setField('paymentMethod', data.optionValue) }}
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
              </Dropdown>
            </Field>
            <TextInputField {...props} field="reference" label="Reference" options={{ placeholder: 'Check or transfer number', maxLength: 100 }} />
          </div>
        </>
      )}

      {values.paymentCondition === 'partial' && (
        <TextInputField
          {...props}
          field="amountPaid"
          label="Amount Paid Now"
          options={{ ...money(), required: true, hint: `Of ${formatAmount(totalCents / 100)}; the rest is recorded as Accounts Payable` }}
        />
      )}

      {leavesBalance && (
        <>
          <div className="purchase-note purchase-note--amber">
            {values.paymentCondition === 'credit'
              ? 'Payment will be recorded as Accounts Payable to the selected vendor. You can pay it later via Bank Payment.'
              : 'The unpaid balance will be recorded as Accounts Payable to the selected vendor. You can pay it later via Bank Payment.'}
          </div>
          <TextInputField {...props} field="dueDate" label="AP Due Date" options={{ type: 'date', hint: 'Optional' }} />
        </>
      )}

      <div className="purchase-entry">
        <div className="purchase-entry__title">Accounting Entry:</div>
        <div className="purchase-entry__row">
          <span>Vehicle Inventory <b className="dr">Dr</b></span>
          <span className="mono">{formatAmount(totalCents / 100)}</span>
        </div>
        {paidCents > 0 && (
          <div className="purchase-entry__row">
            <span>Bank Account <b className="cr">Cr</b></span>
            <span className="mono">{formatAmount(paidCents / 100)}</span>
          </div>
        )}
        {totalCents - paidCents > 0 && (
          <div className="purchase-entry__row">
            <span>Accounts Payable <b className="cr">Cr</b></span>
            <span className="mono">{formatAmount((totalCents - paidCents) / 100)}</span>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Step 4: Review & Post ───────────────────────────────────────────────── */

interface ReviewStepProps {
  values: VehiclePurchaseFormValues
  vendorName: string
  bankAccount: VehicleBankAccountOption | undefined
}

export function ReviewStep({ values, vendorName, bankAccount }: ReviewStepProps) {
  const totalCents = totalCostCents(values)
  const paidCents = Math.min(amountPaidCents(values), totalCents)
  const balanceCents = totalCents - paidCents
  const title = [values.year, values.make.trim(), values.model.trim()].filter(Boolean).join(' ')
  const rows: [string, string][] = [
    ['Vehicle', title || '—'],
    ['VIN', values.vin.trim().toUpperCase() || '—'],
    ['Vendor', vendorName || '—'],
    ['Purchase Date', values.purchaseDate || '—'],
    ['Warehouse', values.warehouse || '—'],
  ]

  return (
    <>
      <h2 className="purchase-card__title">Review &amp; Post</h2>
      <dl className="purchase-review purchase-review--plain">
        {rows.map(([label, value]) => (
          <div key={label} className="purchase-review__row">
            <dt>{label}</dt>
            <dd className={label === 'VIN' ? 'mono' : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="purchase-review">
        <div className="purchase-review__row">
          <dt>Total Vehicle Cost</dt>
          <dd className="mono strong text-blue">{formatAmount(totalCents / 100)}</dd>
        </div>
        <div className="purchase-review__row">
          <dt>Additional Costs</dt>
          <dd className="mono">{formatAmount(additionalCostCents(values) / 100)}</dd>
        </div>
        <div className="purchase-review__row">
          <dt>Payment Method</dt>
          <dd>{paymentConditionLabel(values.paymentCondition)}</dd>
        </div>
        {paidCents > 0 && (
          <div className="purchase-review__row">
            <dt>Paid Now{bankAccount ? ` (${paymentMethodLabel(values.paymentMethod)})` : ''}</dt>
            <dd className="mono">{formatAmount(paidCents / 100)}</dd>
          </div>
        )}
        {bankAccount && paidCents > 0 && (
          <div className="purchase-review__row">
            <dt>From Account</dt>
            <dd>{bankAccountLabel(bankAccount)}</dd>
          </div>
        )}
        {balanceCents > 0 && (
          <div className="purchase-review__row">
            <dt>On Credit (AP){values.dueDate ? `, due ${values.dueDate}` : ''}</dt>
            <dd className="mono">{formatAmount(balanceCents / 100)}</dd>
          </div>
        )}
      </dl>
      <div className="purchase-note purchase-note--blue">
        <div className="purchase-note__title">On Posting This Will:</div>
        <ul>
          <li>✓ Add vehicle to Vehicle Inventory</li>
          <li>✓ Create accounting transaction (Dr Inventory, Cr {[paidCents > 0 && 'Bank', balanceCents > 0 && 'AP'].filter(Boolean).join(' + ')})</li>
          <li>✓ Increase Vehicle Inventory account balance</li>
          {paidCents > 0 && <li>✓ Reduce bank account balance</li>}
          {balanceCents > 0 && <li>✓ Create vendor payable</li>}
        </ul>
      </div>
    </>
  )
}
