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
  MessageBarBody,
  Option,
  Spinner,
} from '@fluentui/react-components'
import { Dismiss20Regular } from '@fluentui/react-icons'
import { useVendorMutations } from '../../hooks/useVendorMutations'
import type { VendorFieldErrors, VendorFormField, VendorFormValues, VendorStatus, VendorType } from '../../types/vendors'
import { VENDOR_TYPE_LABELS, VENDOR_TYPES } from './vendorMetrics'
import './VendorFormDialog.css'

const EMPTY_FORM: VendorFormValues = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  type: 'vehicles',
  status: 'Active',
}

const statusOptions: VendorStatus[] = ['Active', 'Inactive']

const isVendorStatus = (value: unknown): value is VendorStatus => statusOptions.some((option) => option === value)
const isVendorType = (value: unknown): value is VendorType => VENDOR_TYPES.some((type) => type === value)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Required fields follow the Figma design (stricter than the API, which only requires the name)
const REQUIRED_MESSAGES: Partial<Record<VendorFormField, string>> = {
  name: 'Vendor name is required',
  contact: 'Contact person is required',
  phone: 'Phone is required',
  email: 'Email is required',
}

function validate(values: VendorFormValues): VendorFieldErrors {
  const errors: VendorFieldErrors = {}
  for (const [field, message] of Object.entries(REQUIRED_MESSAGES) as [VendorFormField, string][]) {
    if (!values[field].trim()) errors[field] = message
  }
  if (!errors.email && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address'
  return errors
}

interface VendorFormDialogProps {
  onClose: () => void
}

// Mounted only while open, so every opening starts from an empty form
export function VendorFormDialog({ onClose }: VendorFormDialogProps) {
  const { saveStatus, saveError, fieldErrors, create } = useVendorMutations()
  const [values, setValues] = useState<VendorFormValues>(EMPTY_FORM)
  const [clientErrors, setClientErrors] = useState<VendorFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<VendorFormField>>(new Set())
  const isSaving = saveStatus === 'loading'

  const errorFor = (field: VendorFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setField = <K extends VendorFormField>(field: K, value: VendorFormValues[K]) => {
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

  const textField = (field: Exclude<VendorFormField, 'type' | 'status'>, label: string, placeholder: string, maxLength: number, extra?: { type?: 'email' | 'tel'; autoFocus?: boolean }) => (
    <Field
      label={label}
      required={field in REQUIRED_MESSAGES}
      validationState={errorFor(field) ? 'error' : 'none'}
      validationMessage={errorFor(field)}
    >
      <Input
        type={extra?.type}
        autoFocus={extra?.autoFocus}
        value={values[field]}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(_, data) => setField(field, data.value)}
      />
    </Field>
  )

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open && !isSaving) onClose() }}>
      <DialogSurface className="vendor-dialog" aria-describedby="vendor-dialog-subtitle">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="vendor-dialog__body">
            <header className="vendor-dialog__header">
              <div>
                <DialogTitle>New Vendor</DialogTitle>
                <p id="vendor-dialog-subtitle">Add a supplier or service provider</p>
              </div>
              <Button appearance="transparent" aria-label="Close new vendor form" icon={<Dismiss20Regular />} disabled={isSaving} onClick={onClose} />
            </header>

            <DialogContent className="vendor-dialog__content">
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}

              <fieldset className="vendor-dialog__section" disabled={isSaving}>
                <legend>Company Information</legend>
                {textField('name', 'Vendor Name', 'e.g. Toyota Motor Corp', 150, { autoFocus: true })}
                <div className="vendor-dialog__grid">
                  <Field label="Vendor Type" validationState={errorFor('type') ? 'error' : 'none'} validationMessage={errorFor('type')}>
                    <Dropdown
                      value={VENDOR_TYPE_LABELS[values.type]}
                      selectedOptions={[values.type]}
                      onOptionSelect={(_, data) => { if (isVendorType(data.optionValue)) setField('type', data.optionValue) }}
                    >
                      {VENDOR_TYPES.map((type) => <Option key={type} value={type}>{VENDOR_TYPE_LABELS[type]}</Option>)}
                    </Dropdown>
                  </Field>
                  <Field label="Status" validationState={errorFor('status') ? 'error' : 'none'} validationMessage={errorFor('status')}>
                    <Dropdown
                      value={values.status}
                      selectedOptions={[values.status]}
                      onOptionSelect={(_, data) => { if (isVendorStatus(data.optionValue)) setField('status', data.optionValue) }}
                    >
                      {statusOptions.map((status) => <Option key={status} value={status}>{status}</Option>)}
                    </Dropdown>
                  </Field>
                </div>
                {textField('address', 'Address', 'Street, City, State ZIP', 255)}
              </fieldset>

              <fieldset className="vendor-dialog__section" disabled={isSaving}>
                <legend>Contact Information</legend>
                {textField('contact', 'Contact Person', 'Full name', 150)}
                <div className="vendor-dialog__grid">
                  {textField('phone', 'Phone', '+1 (555) 000-0000', 30, { type: 'tel' })}
                  {textField('email', 'Email', 'contact@vendor.com', 255, { type: 'email' })}
                </div>
              </fieldset>
            </DialogContent>

            <DialogActions className="vendor-dialog__footer">
              <Button disabled={isSaving} onClick={onClose}>Cancel</Button>
              <Button type="submit" appearance="primary" disabled={isSaving} icon={isSaving ? <Spinner size="tiny" /> : undefined}>
                {isSaving ? 'Saving…' : 'Save Vendor'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
