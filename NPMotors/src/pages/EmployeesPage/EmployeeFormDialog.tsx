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
import { useEmployeeMutations } from '../../hooks/useEmployeeMutations'
import type {
  EmployeeDepartment,
  EmployeeFieldErrors,
  EmployeeFormField,
  EmployeeFormValues,
  EmployeeStatus,
} from '../../types/employees'
import { EMPLOYEE_DEPARTMENTS } from './employeeMetrics'
import './EmployeeFormDialog.css'

// The design's phone, email and hire date fields are left out: EmployeeCreateDto has nowhere to store them
const EMPTY_FORM: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  department: 'Sales',
  job: '',
  status: 'Active',
  salary: '',
  bonus: '0',
  commissionRate: '0',
}

const statusOptions: EmployeeStatus[] = ['Active', 'Inactive']

const isEmployeeStatus = (value: unknown): value is EmployeeStatus => statusOptions.some((option) => option === value)
const isEmployeeDepartment = (value: unknown): value is EmployeeDepartment => EMPLOYEE_DEPARTMENTS.some((department) => department === value)

// Required fields follow the Figma design (stricter than the API, which only requires the names)
const REQUIRED_MESSAGES: Partial<Record<EmployeeFormField, string>> = {
  firstName: 'First name is required',
  lastName: 'Last name is required',
  job: 'Job title is required',
}

const toNumber = (value: string) => (value.trim() ? Number(value) : NaN)

function validate(values: EmployeeFormValues): EmployeeFieldErrors {
  const errors: EmployeeFieldErrors = {}
  for (const [field, message] of Object.entries(REQUIRED_MESSAGES) as [EmployeeFormField, string][]) {
    if (!values[field].trim()) errors[field] = message
  }
  const salary = toNumber(values.salary)
  if (!(salary > 0)) errors.salary = 'Enter a salary greater than zero'
  // Optional numbers: blank is fine, otherwise mirror the API's ranges
  const bonus = toNumber(values.bonus)
  if (values.bonus.trim() && !(bonus >= 0)) errors.bonus = 'Bonus cannot be negative'
  const commission = toNumber(values.commissionRate)
  if (values.commissionRate.trim() && !(commission >= 0 && commission <= 100)) errors.commissionRate = 'Commission must be between 0 and 100'
  return errors
}

interface EmployeeFormDialogProps {
  onClose: () => void
}

// Mounted only while open, so every opening starts from an empty form
export function EmployeeFormDialog({ onClose }: EmployeeFormDialogProps) {
  const { saveStatus, saveError, fieldErrors, create } = useEmployeeMutations()
  const [values, setValues] = useState<EmployeeFormValues>(EMPTY_FORM)
  const [clientErrors, setClientErrors] = useState<EmployeeFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<EmployeeFormField>>(new Set())
  const isSaving = saveStatus === 'loading'

  const errorFor = (field: EmployeeFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setField = <K extends EmployeeFormField>(field: K, value: EmployeeFormValues[K]) => {
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

  const textField = (field: Exclude<EmployeeFormField, 'department' | 'status'>, label: string, extra?: { placeholder?: string; maxLength?: number; type?: 'number'; min?: number; max?: number; step?: number; autoFocus?: boolean }) => (
    <Field
      label={label}
      required={field in REQUIRED_MESSAGES || field === 'salary'}
      validationState={errorFor(field) ? 'error' : 'none'}
      validationMessage={errorFor(field)}
    >
      <Input
        type={extra?.type}
        min={extra?.min}
        max={extra?.max}
        step={extra?.step}
        autoFocus={extra?.autoFocus}
        value={values[field]}
        maxLength={extra?.maxLength}
        placeholder={extra?.placeholder}
        onChange={(_, data) => setField(field, data.value)}
      />
    </Field>
  )

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open && !isSaving) onClose() }}>
      <DialogSurface className="employee-dialog" aria-describedby="employee-dialog-subtitle">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="employee-dialog__body">
            <header className="employee-dialog__header">
              <div>
                <DialogTitle>Add Employee</DialogTitle>
                <p id="employee-dialog-subtitle">Create a new NPMotors employee record</p>
              </div>
              <Button appearance="transparent" aria-label="Close add employee form" icon={<Dismiss20Regular />} disabled={isSaving} onClick={onClose} />
            </header>

            <DialogContent className="employee-dialog__content">
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}

              <fieldset className="employee-dialog__section" disabled={isSaving}>
                <legend>Personal Information</legend>
                <div className="employee-dialog__grid">
                  {textField('firstName', 'First Name', { maxLength: 100, autoFocus: true })}
                  {textField('lastName', 'Last Name', { maxLength: 100 })}
                </div>
              </fieldset>

              <fieldset className="employee-dialog__section" disabled={isSaving}>
                <legend>Employment Details</legend>
                <div className="employee-dialog__grid">
                  <Field label="Department" validationState={errorFor('department') ? 'error' : 'none'} validationMessage={errorFor('department')}>
                    <Dropdown
                      value={values.department}
                      selectedOptions={[values.department]}
                      onOptionSelect={(_, data) => { if (isEmployeeDepartment(data.optionValue)) setField('department', data.optionValue) }}
                    >
                      {EMPLOYEE_DEPARTMENTS.map((department) => <Option key={department} value={department}>{department}</Option>)}
                    </Dropdown>
                  </Field>
                  {textField('job', 'Job Title', { placeholder: 'Sales Representative', maxLength: 100 })}
                  <Field label="Status" validationState={errorFor('status') ? 'error' : 'none'} validationMessage={errorFor('status')}>
                    <Dropdown
                      value={values.status}
                      selectedOptions={[values.status]}
                      onOptionSelect={(_, data) => { if (isEmployeeStatus(data.optionValue)) setField('status', data.optionValue) }}
                    >
                      {statusOptions.map((status) => <Option key={status} value={status}>{status}</Option>)}
                    </Dropdown>
                  </Field>
                  {textField('salary', 'Salary', { type: 'number', min: 0 })}
                  {textField('bonus', 'Bonus', { type: 'number', min: 0 })}
                  {textField('commissionRate', 'Commission %', { type: 'number', min: 0, max: 100, step: 0.1 })}
                </div>
              </fieldset>
            </DialogContent>

            <DialogActions className="employee-dialog__footer">
              <Button disabled={isSaving} onClick={onClose}>Cancel</Button>
              <Button type="submit" appearance="primary" disabled={isSaving} icon={isSaving ? <Spinner size="tiny" /> : undefined}>
                {isSaving ? 'Saving…' : 'Add Employee'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
