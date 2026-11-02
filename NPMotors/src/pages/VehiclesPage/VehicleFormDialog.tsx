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
import { Dismiss20Regular } from '@fluentui/react-icons'
import { useVehicleMutations } from '../../hooks/useVehicleMutations'
import { useVehicleVendorOptions } from '../../hooks/useVehicleVendorOptions'
import type { VehicleFieldErrors, VehicleFormField, VehicleFormValues } from '../../types/vehicles'
import { formatCurrency } from './vehicleMetrics'
import './VehicleFormDialog.css'

// YYYY-MM-DD in local time, the value <input type="date"> expects
const today = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// The design's Engine, payment and separate transport/tax/other cost fields are left out: VehicleCreateDto
// has nowhere to store them (it takes one additional-costs figure)
const emptyForm = (): VehicleFormValues => ({
  vendorId: '',
  vin: '',
  make: '',
  model: '',
  year: '',
  color: '',
  purchaseDate: today(),
  warehouse: '',
  purchasePrice: '',
  additionalCosts: '0',
  sellingPrice: '',
})

// Fixed list: the lots the existing inventory uses. The API stores warehouse as free text, so it doesn't enforce these.
const WAREHOUSE_OPTIONS = ['Main Lot', 'Showroom', 'Lot B'] as const

const MAX_YEAR = new Date().getFullYear() + 1
const MIN_YEAR = 1900

// Required fields follow the Figma design (stricter than the API, which only requires vendor, VIN and purchase price)
const REQUIRED_MESSAGES: Partial<Record<VehicleFormField, string>> = {
  vendorId: 'Select a vendor',
  purchaseDate: 'Purchase date is required',
  make: 'Make is required',
  model: 'Model is required',
  vin: 'VIN is required',
}

const toNumber = (value: string) => (value.trim() ? Number(value) : NaN)

function validate(values: VehicleFormValues): VehicleFieldErrors {
  const errors: VehicleFieldErrors = {}
  for (const [field, message] of Object.entries(REQUIRED_MESSAGES) as [VehicleFormField, string][]) {
    if (!values[field].trim()) errors[field] = message
  }
  const year = toNumber(values.year)
  if (!(Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR)) errors.year = `Enter a year from ${MIN_YEAR} to ${MAX_YEAR}`
  // The API requires a purchase price of at least 0.01
  const price = toNumber(values.purchasePrice)
  if (!(price > 0)) errors.purchasePrice = 'Enter a purchase price greater than zero'
  // Optional amounts: blank is fine, otherwise mirror the API's minimum of zero
  if (values.additionalCosts.trim() && !(toNumber(values.additionalCosts) >= 0)) errors.additionalCosts = 'Costs cannot be negative'
  if (values.sellingPrice.trim() && !(toNumber(values.sellingPrice) >= 0)) errors.sellingPrice = 'List price cannot be negative'
  return errors
}

// Running total for the design's cost summary; unparsable amounts count as zero
const amount = (value: string) => {
  const parsed = toNumber(value)
  return Number.isFinite(parsed) ? parsed : 0
}

interface VehicleFormDialogProps {
  onClose: () => void
}

type TextField = Exclude<VehicleFormField, 'vendorId' | 'warehouse'>

interface TextFieldOptions {
  type?: 'number' | 'date'
  placeholder?: string
  maxLength?: number
  min?: number
  max?: number
  step?: number
  mono?: boolean
}

// Mounted only while open, so every opening starts from an empty form
export function VehicleFormDialog({ onClose }: VehicleFormDialogProps) {
  const { saveStatus, saveError, fieldErrors, create } = useVehicleMutations()
  const { vendorOptions, vendorOptionsStatus, vendorOptionsError, retry: retryVendors } = useVehicleVendorOptions()
  const [values, setValues] = useState<VehicleFormValues>(emptyForm)
  const [clientErrors, setClientErrors] = useState<VehicleFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<VehicleFormField>>(new Set())
  const isSaving = saveStatus === 'loading'
  const isLoadingVendors = vendorOptionsStatus === 'loading' || vendorOptionsStatus === 'idle'

  const errorFor = (field: VehicleFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setField = (field: VehicleFormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setClientErrors((current) => ({ ...current, [field]: undefined }))
    setEditedFields((current) => new Set(current).add(field))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validate(values)
    setClientErrors(errors)
    if (Object.keys(errors).length) return
    setEditedFields(new Set())
    create(values)
  }

  const textField = (field: TextField, label: string, options: TextFieldOptions = {}) => (
    <Field
      label={label}
      required={field in REQUIRED_MESSAGES || field === 'year' || field === 'purchasePrice'}
      validationState={errorFor(field) ? 'error' : 'none'}
      validationMessage={errorFor(field)}
    >
      <Input
        className={options.mono ? 'vehicle-dialog__mono' : undefined}
        type={options.type}
        min={options.min}
        max={options.max}
        step={options.step}
        value={values[field]}
        maxLength={options.maxLength}
        placeholder={options.placeholder}
        onChange={(_, data) => setField(field, data.value)}
      />
    </Field>
  )

  const vendorName = vendorOptions.find((option) => option.id === values.vendorId)?.name ?? ''
  const totalCost = amount(values.purchasePrice) + amount(values.additionalCosts)

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open && !isSaving) onClose() }}>
      <DialogSurface className="vehicle-dialog" aria-describedby="vehicle-dialog-subtitle">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="vehicle-dialog__body">
            <header className="vehicle-dialog__header">
              <div>
                <DialogTitle>Add Vehicle</DialogTitle>
                <p id="vehicle-dialog-subtitle">Add a purchased vehicle to inventory</p>
              </div>
              <Button appearance="transparent" aria-label="Close add vehicle form" icon={<Dismiss20Regular />} disabled={isSaving} onClick={onClose} />
            </header>

            <DialogContent className="vehicle-dialog__content">
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}

              {vendorOptionsStatus === 'error' && (
                <MessageBar intent="warning">
                  <MessageBarBody>{vendorOptionsError}</MessageBarBody>
                  <MessageBarActions>
                    <Button size="small" onClick={retryVendors}>Retry</Button>
                  </MessageBarActions>
                </MessageBar>
              )}

              <fieldset className="vehicle-dialog__section" disabled={isSaving}>
                <legend>Vehicle Information</legend>
                <div className="vehicle-dialog__grid">
                  <Field label="Vendor / Seller" required validationState={errorFor('vendorId') ? 'error' : 'none'} validationMessage={errorFor('vendorId')}>
                    <Dropdown
                      value={vendorName}
                      selectedOptions={values.vendorId ? [values.vendorId] : []}
                      placeholder={isLoadingVendors ? 'Loading vendors…' : 'Select vendor…'}
                      disabled={isLoadingVendors || vendorOptionsStatus === 'error'}
                      onOptionSelect={(_, data) => { if (data.optionValue) setField('vendorId', data.optionValue) }}
                    >
                      {vendorOptions.map((option) => <Option key={option.id} value={option.id}>{option.name}</Option>)}
                    </Dropdown>
                  </Field>
                  {textField('purchaseDate', 'Purchase Date', { type: 'date' })}
                  {textField('make', 'Make', { placeholder: 'Toyota', maxLength: 50 })}
                  {textField('model', 'Model', { placeholder: 'Camry', maxLength: 50 })}
                  {textField('year', 'Year', { type: 'number', placeholder: String(MAX_YEAR - 1), min: MIN_YEAR, max: MAX_YEAR })}
                  {textField('color', 'Color', { placeholder: 'Silver', maxLength: 30 })}
                  <Field label="Warehouse" validationState={errorFor('warehouse') ? 'error' : 'none'} validationMessage={errorFor('warehouse')}>
                    <Dropdown
                      value={values.warehouse}
                      selectedOptions={values.warehouse ? [values.warehouse] : []}
                      placeholder="Select warehouse…"
                      onOptionSelect={(_, data) => { if (data.optionValue) setField('warehouse', data.optionValue) }}
                    >
                      {WAREHOUSE_OPTIONS.map((warehouse) => <Option key={warehouse} value={warehouse}>{warehouse}</Option>)}
                    </Dropdown>
                  </Field>
                  {textField('vin', 'VIN Number', { placeholder: '1HGCR2F3XEA000000', maxLength: 17, mono: true })}
                </div>
              </fieldset>

              <fieldset className="vehicle-dialog__section" disabled={isSaving}>
                <legend>Acquisition Costs</legend>
                <div className="vehicle-dialog__grid">
                  {textField('purchasePrice', 'Purchase Price', { type: 'number', placeholder: '0.00', min: 0, step: 0.01, mono: true })}
                  {textField('additionalCosts', 'Additional Costs', { type: 'number', placeholder: '0.00', min: 0, step: 0.01, mono: true })}
                  {textField('sellingPrice', 'List Price', { type: 'number', placeholder: '0.00', min: 0, step: 0.01, mono: true })}
                  <div className="vehicle-dialog__total" aria-live="polite">
                    <span>Total Vehicle Cost</span>
                    <strong>{formatCurrency(totalCost)}</strong>
                  </div>
                </div>
              </fieldset>
            </DialogContent>

            <DialogActions className="vehicle-dialog__footer">
              <Button disabled={isSaving} onClick={onClose}>Cancel</Button>
              <Button type="submit" appearance="primary" disabled={isSaving} icon={isSaving ? <Spinner size="tiny" /> : undefined}>
                {isSaving ? 'Saving…' : 'Add Vehicle'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
