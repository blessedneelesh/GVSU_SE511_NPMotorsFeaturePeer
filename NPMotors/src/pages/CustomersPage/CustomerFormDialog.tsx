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
import { useCustomerMutations } from '../../hooks/useCustomerMutations'
import type { CustomerFieldErrors, CustomerFormField, CustomerFormValues, CustomerStatus } from '../../types/customers'
import './CustomerFormDialog.css'

const EMPTY_FORM: CustomerFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'TX',
  zip: '',
  status: 'Active',
}

const statusOptions: CustomerStatus[] = ['Active', 'Inactive']

const isCustomerStatus = (value: unknown): value is CustomerStatus => statusOptions.some((option) => option === value)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Required fields follow the Figma design (stricter than the API, which only requires name and email)
const REQUIRED_MESSAGES: Partial<Record<CustomerFormField, string>> = {
  firstName: 'First name is required',
  lastName: 'Last name is required',
  phone: 'Phone is required',
  email: 'Email is required',
  address: 'Street address is required',
  city: 'City is required',
  state: 'State is required',
  zip: 'ZIP code is required',
}

function validate(values: CustomerFormValues): CustomerFieldErrors {
  const errors: CustomerFieldErrors = {}
  for (const [field, message] of Object.entries(REQUIRED_MESSAGES) as [CustomerFormField, string][]) {
    if (!values[field].trim()) errors[field] = message
  }
  if (!errors.email && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address'
  return errors
}

interface CustomerFormDialogProps {
  onClose: () => void
}

// Mounted only while open, so every opening starts from an empty form
export function CustomerFormDialog({ onClose }: CustomerFormDialogProps) {
  const { saveStatus, saveError, fieldErrors, create } = useCustomerMutations()
  const [values, setValues] = useState<CustomerFormValues>(EMPTY_FORM)
  const [clientErrors, setClientErrors] = useState<CustomerFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<CustomerFormField>>(new Set())
  const isSaving = saveStatus === 'loading'

  const errorFor = (field: CustomerFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setField = <K extends CustomerFormField>(field: K, value: CustomerFormValues[K]) => {
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

  const textField = (field: CustomerFormField, label: string, placeholder: string, maxLength: number, extra?: { type?: 'email' | 'tel'; autoFocus?: boolean; className?: string }) => (
    <Field
      className={extra?.className}
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
      <DialogSurface className="customer-dialog" aria-describedby="customer-dialog-subtitle">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="customer-dialog__body">
            <header className="customer-dialog__header">
              <div>
                <DialogTitle>New Customer</DialogTitle>
                <p id="customer-dialog-subtitle">Add a customer to NPMotors</p>
              </div>
              <Button appearance="transparent" aria-label="Close new customer form" icon={<Dismiss20Regular />} disabled={isSaving} onClick={onClose} />
            </header>

            <DialogContent className="customer-dialog__content">
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}

              <fieldset className="customer-dialog__section" disabled={isSaving}>
                <legend>Customer Information</legend>
                <div className="customer-dialog__grid customer-dialog__grid--2">
                  {textField('firstName', 'First Name', 'First name', 100, { autoFocus: true })}
                  {textField('lastName', 'Last Name', 'Last name', 100)}
                  {textField('phone', 'Phone', '(214) 555-0100', 30, { type: 'tel' })}
                  {textField('email', 'Email', 'customer@email.com', 255, { type: 'email' })}
                  <Field className="customer-dialog__span-2" label="Status">
                    <Dropdown
                      value={values.status}
                      selectedOptions={[values.status]}
                      onOptionSelect={(_, data) => { if (isCustomerStatus(data.optionValue)) setField('status', data.optionValue) }}
                    >
                      {statusOptions.map((status) => <Option key={status} value={status}>{status}</Option>)}
                    </Dropdown>
                  </Field>
                </div>
              </fieldset>

              <fieldset className="customer-dialog__section" disabled={isSaving}>
                <legend>Billing Address</legend>
                {textField('address', 'Street Address', '1250 Motor Mile Drive', 255)}
                <div className="customer-dialog__grid customer-dialog__grid--5">
                  {textField('city', 'City', 'Dallas', 100, { className: 'customer-dialog__span-3' })}
                  {textField('state', 'State', 'TX', 2)}
                  {textField('zip', 'ZIP', '75201', 20)}
                </div>
              </fieldset>
            </DialogContent>

            <DialogActions className="customer-dialog__footer">
              <Button disabled={isSaving} onClick={onClose}>Cancel</Button>
              <Button type="submit" appearance="primary" disabled={isSaving} icon={isSaving ? <Spinner size="tiny" /> : undefined}>
                {isSaving ? 'Saving…' : 'Save Customer'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
