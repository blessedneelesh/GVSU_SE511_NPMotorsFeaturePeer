import { todayIsoDate } from '../TransfersPage/transferMetrics'
import { toCents, totalCostCents } from '../../services/vehicles/vehicles.mappers'
import type {
  VehicleBankAccountOption,
  VehiclePaymentCondition,
  VehiclePaymentMethod,
  VehiclePurchaseFieldErrors,
  VehiclePurchaseFormField,
  VehiclePurchaseFormValues,
} from '../../types/vehicles'

import { formatAmount } from '../StatementLinesPage/statementLineMetrics'

// Two-decimal amounts, as the rest of the purchase shows money with cents
export { formatAmount }

export type PurchaseStep = 1 | 2 | 3 | 4

// The design's wizard steps; the last one has no fields, it reviews and posts
export const PURCHASE_STEPS: readonly { step: PurchaseStep; label: string }[] = [
  { step: 1, label: 'Vehicle Info' },
  { step: 2, label: 'Costs' },
  { step: 3, label: 'Payment' },
  { step: 4, label: 'Review' },
]

// The design's sidebar checklist: item i is ticked once the wizard is past step i
export const WORKFLOW_ITEMS = ['Select Vendor', 'Enter Vehicle Info', 'Enter Costs', 'Payment Method', 'Review & Post', 'Add to Inventory'] as const

const STEP_FIELDS: Record<Exclude<PurchaseStep, 4>, readonly VehiclePurchaseFormField[]> = {
  1: ['vendorId', 'purchaseDate', 'make', 'model', 'year', 'color', 'warehouse', 'vin'],
  2: ['purchasePrice', 'salesTax', 'transportCost', 'otherCosts', 'sellingPrice'],
  3: ['paymentCondition', 'amountPaid', 'paymentMethod', 'bankAccountId', 'reference', 'dueDate'],
}

// The warehouses the inventory uses, as in the design (the API stores free text)
export const WAREHOUSE_OPTIONS = ['WH-A', 'WH-B', 'WH-C'] as const

// The design offers "Pay from Bank Account" and "Accounts Payable (Credit)"; the API also takes a partial payment,
// which pays part from the bank and leaves the rest on an AP bill
export const PAYMENT_CONDITION_OPTIONS: readonly { value: VehiclePaymentCondition; label: string }[] = [
  { value: 'paidInFull', label: 'Pay from Bank Account' },
  { value: 'partial', label: 'Partial Payment' },
  { value: 'credit', label: 'Accounts Payable (Credit)' },
]

export const PAYMENT_METHOD_OPTIONS: readonly { value: VehiclePaymentMethod; label: string }[] = [
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
]

export const isPaymentCondition = (value: unknown): value is VehiclePaymentCondition =>
  PAYMENT_CONDITION_OPTIONS.some((option) => option.value === value)

export const isPaymentMethod = (value: unknown): value is VehiclePaymentMethod =>
  PAYMENT_METHOD_OPTIONS.some((option) => option.value === value)

export const MAX_YEAR = new Date().getFullYear() + 1
export const MIN_YEAR = 1900
const VIN_LENGTH = 17
const MAX_REFERENCE_LENGTH = 100

export const emptyPurchaseForm = (): VehiclePurchaseFormValues => ({
  vendorId: '',
  purchaseDate: todayIsoDate(),
  make: '',
  model: '',
  year: '',
  color: '',
  warehouse: WAREHOUSE_OPTIONS[0],
  vin: '',
  purchasePrice: '',
  salesTax: '',
  transportCost: '',
  otherCosts: '',
  sellingPrice: '',
  paymentCondition: 'paidInFull',
  amountPaid: '',
  paymentMethod: 'transfer',
  bankAccountId: '',
  reference: '',
  dueDate: '',
})

// Money inputs: a non-negative number with at most two decimals (more would be silently rounded to the cent)
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

function amountError(value: string, label: string, { required = false, positive = false } = {}): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return required ? `${label} is required` : undefined
  if (!Number.isFinite(Number(trimmed))) return 'Enter a valid amount'
  if (Number(trimmed) < 0) return `${label} cannot be negative`
  if (!AMOUNT_PATTERN.test(trimmed)) return 'Use at most two decimal places'
  if (positive && !(Number(trimmed) > 0)) return `${label} must be greater than zero`
  return undefined
}

// Required fields follow the design (stricter than the API, which only needs vendor, VIN and purchase price)
function validateVehicleInfo(values: VehiclePurchaseFormValues): VehiclePurchaseFieldErrors {
  const errors: VehiclePurchaseFieldErrors = {}
  if (!values.vendorId) errors.vendorId = 'Select a vendor'
  if (!values.purchaseDate) errors.purchaseDate = 'Purchase date is required'
  if (!values.make.trim()) errors.make = 'Make is required'
  if (!values.model.trim()) errors.model = 'Model is required'
  const year = values.year.trim() ? Number(values.year) : NaN
  if (!(Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR)) errors.year = `Enter a year from ${MIN_YEAR} to ${MAX_YEAR}`
  const vin = values.vin.trim()
  if (!vin) errors.vin = 'VIN is required'
  else if (vin.length !== VIN_LENGTH) errors.vin = `VIN must be exactly ${VIN_LENGTH} characters`
  return errors
}

function validateCosts(values: VehiclePurchaseFormValues): VehiclePurchaseFieldErrors {
  const errors: VehiclePurchaseFieldErrors = {}
  const checks: [VehiclePurchaseFormField, string | undefined][] = [
    ['purchasePrice', amountError(values.purchasePrice, 'Purchase price', { required: true, positive: true })],
    ['salesTax', amountError(values.salesTax, 'Sales tax')],
    ['transportCost', amountError(values.transportCost, 'Transportation')],
    ['otherCosts', amountError(values.otherCosts, 'Other costs')],
    ['sellingPrice', amountError(values.sellingPrice, 'List price')],
  ]
  for (const [field, message] of checks) if (message) errors[field] = message
  return errors
}

// The API's rules: paid in full pays the whole total, a partial payment is more than zero and less than the total,
// and any payment needs a method and a bank account
function validatePayment(values: VehiclePurchaseFormValues): VehiclePurchaseFieldErrors {
  const errors: VehiclePurchaseFieldErrors = {}
  if (values.paymentCondition === 'partial') {
    const message = amountError(values.amountPaid, 'Amount paid', { required: true, positive: true })
    if (message) errors.amountPaid = message
    else if (toCents(values.amountPaid) >= totalCostCents(values)) errors.amountPaid = 'A partial payment must be less than the total cost'
  }
  if (values.paymentCondition !== 'credit') {
    if (!values.bankAccountId) errors.bankAccountId = 'Select the account to pay from'
    if (values.reference.trim().length > MAX_REFERENCE_LENGTH) errors.reference = `Use at most ${MAX_REFERENCE_LENGTH} characters`
  }
  if (values.paymentCondition !== 'paidInFull' && values.dueDate && values.purchaseDate && values.dueDate < values.purchaseDate) {
    errors.dueDate = 'Due date cannot be before the purchase date'
  }
  return errors
}

export function validateStep(step: PurchaseStep, values: VehiclePurchaseFormValues): VehiclePurchaseFieldErrors {
  if (step === 1) return validateVehicleInfo(values)
  if (step === 2) return validateCosts(values)
  if (step === 3) return validatePayment(values)
  return {}
}

// The step that holds the first of these errors, so a failed check or post can send the user back to it
export function firstStepWithError(errors: VehiclePurchaseFieldErrors): PurchaseStep | null {
  for (const step of [1, 2, 3] as const) {
    if (STEP_FIELDS[step].some((field) => errors[field])) return step
  }
  return null
}

export const paymentConditionLabel = (condition: VehiclePaymentCondition) =>
  PAYMENT_CONDITION_OPTIONS.find((option) => option.value === condition)?.label ?? ''

export const paymentMethodLabel = (method: VehiclePaymentMethod) =>
  PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? ''

// "Chase — Operating ($120,000.00)", as the design lists accounts with their balance
export const bankAccountLabel = (account: VehicleBankAccountOption) =>
  `${account.bankName ? `${account.bankName} — ` : ''}${account.name} (${formatAmount(account.bookBalance)})`
