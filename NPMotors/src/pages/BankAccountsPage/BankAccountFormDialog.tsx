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
import { useBankAccountMutations } from '../../hooks/useBankAccountMutations'
import { useBankOptions } from '../../hooks/useBankOptions'
import type { BankAccountFieldErrors, BankAccountFormField, BankAccountFormValues, BankAccountType } from '../../types/bankAccounts'
import { BANK_ACCOUNT_TYPES } from './bankAccountMetrics'
import './BankAccountFormDialog.css'

const EMPTY_FORM: BankAccountFormValues = {
  bankId: '',
  name: '',
  type: 'Checking',
  accountNumber: '',
  routing: '',
  openingBalance: '',
}

const isBankAccountType = (value: unknown): value is BankAccountType => BANK_ACCOUNT_TYPES.some((type) => type === value)

// BankAccountCreateDto caps openingBalance at 999,999,999,999.99
const MAX_OPENING_BALANCE = 999_999_999_999.99

// Required fields follow the Figma design and the API: bank, account type and account name
function validate(values: BankAccountFormValues): BankAccountFieldErrors {
  const errors: BankAccountFieldErrors = {}
  if (!values.bankId) errors.bankId = 'Select a bank'
  if (!values.name.trim()) errors.name = 'Account name is required'
  if (values.openingBalance.trim()) {
    const balance = Number(values.openingBalance)
    if (!Number.isFinite(balance) || balance < 0) errors.openingBalance = 'Opening balance cannot be negative'
    else if (balance > MAX_OPENING_BALANCE) errors.openingBalance = 'Opening balance is too large'
  }
  return errors
}

interface BankAccountFormDialogProps {
  onClose: () => void
}

// Mounted only while open, so every opening starts from an empty form
export function BankAccountFormDialog({ onClose }: BankAccountFormDialogProps) {
  const { saveStatus, saveError, fieldErrors, create } = useBankAccountMutations()
  const { bankOptions, bankOptionsStatus, bankOptionsError, retry: retryBanks } = useBankOptions()
  const [values, setValues] = useState<BankAccountFormValues>(EMPTY_FORM)
  const [clientErrors, setClientErrors] = useState<BankAccountFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<BankAccountFormField>>(new Set())
  const isSaving = saveStatus === 'loading'
  // A reload keeps the previous banks, so only an empty list blocks the dropdown
  const isLoadingBanks = (bankOptionsStatus === 'loading' || bankOptionsStatus === 'idle') && bankOptions.length === 0

  const errorFor = (field: BankAccountFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setField = <K extends BankAccountFormField>(field: K, value: BankAccountFormValues[K]) => {
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

  const textField = (
    field: Exclude<BankAccountFormField, 'bankId' | 'type'>,
    label: string,
    placeholder: string,
    extra: { maxLength?: number; mono?: boolean; type?: 'number'; autoFocus?: boolean; required?: boolean } = {},
  ) => (
    <Field
      label={label}
      required={extra.required}
      validationState={errorFor(field) ? 'error' : 'none'}
      validationMessage={errorFor(field)}
    >
      <Input
        className={extra.mono ? 'mono' : undefined}
        type={extra.type}
        min={extra.type === 'number' ? 0 : undefined}
        step={extra.type === 'number' ? 0.01 : undefined}
        autoFocus={extra.autoFocus}
        value={values[field]}
        maxLength={extra.maxLength}
        placeholder={placeholder}
        onChange={(_, data) => setField(field, data.value)}
      />
    </Field>
  )

  const bankName = bankOptions.find((option) => option.id === values.bankId)?.name ?? ''

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open && !isSaving) onClose() }}>
      <DialogSurface className="bank-account-dialog" aria-describedby="bank-account-dialog-subtitle">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="bank-account-dialog__body">
            <header className="bank-account-dialog__header">
              <div>
                <DialogTitle>Add Bank Account</DialogTitle>
                <p id="bank-account-dialog-subtitle">Add an account to one of your banks</p>
              </div>
              <Button appearance="transparent" aria-label="Close add bank account form" icon={<Dismiss20Regular />} disabled={isSaving} onClick={onClose} />
            </header>

            <DialogContent className="bank-account-dialog__content">
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}

              {bankOptionsStatus === 'error' && (
                <MessageBar intent="warning">
                  <MessageBarBody>{bankOptionsError}</MessageBarBody>
                  <MessageBarActions>
                    <Button size="small" onClick={retryBanks}>Retry</Button>
                  </MessageBarActions>
                </MessageBar>
              )}

              <fieldset className="bank-account-dialog__section" disabled={isSaving}>
                <div className="bank-account-dialog__grid">
                  <Field label="Bank Name" required validationState={errorFor('bankId') ? 'error' : 'none'} validationMessage={errorFor('bankId')}>
                    <Dropdown
                      placeholder={isLoadingBanks ? 'Loading banks…' : 'Select a bank'}
                      value={bankName}
                      selectedOptions={values.bankId ? [values.bankId] : []}
                      disabled={isLoadingBanks || bankOptions.length === 0}
                      onOptionSelect={(_, data) => { if (data.optionValue) setField('bankId', data.optionValue) }}
                    >
                      {bankOptions.map((option) => <Option key={option.id} value={option.id}>{option.name}</Option>)}
                    </Dropdown>
                  </Field>
                  <Field label="Account Type" required validationState={errorFor('type') ? 'error' : 'none'} validationMessage={errorFor('type')}>
                    <Dropdown
                      value={values.type}
                      selectedOptions={[values.type]}
                      onOptionSelect={(_, data) => { if (isBankAccountType(data.optionValue)) setField('type', data.optionValue) }}
                    >
                      {BANK_ACCOUNT_TYPES.map((type) => <Option key={type} value={type}>{type}</Option>)}
                    </Dropdown>
                  </Field>
                </div>
                {textField('name', 'Account Name', 'e.g. Operations Account', { maxLength: 150, autoFocus: true, required: true })}
                <div className="bank-account-dialog__grid">
                  {textField('accountNumber', 'Account Number', '123456789', { maxLength: 50, mono: true })}
                  {textField('routing', 'Routing Number', '021000021', { maxLength: 20, mono: true })}
                </div>
                <div className="bank-account-dialog__grid">
                  {textField('openingBalance', 'Opening Balance', '0.00', { type: 'number', mono: true })}
                </div>
              </fieldset>
            </DialogContent>

            <DialogActions className="bank-account-dialog__footer">
              <Button disabled={isSaving} onClick={onClose}>Cancel</Button>
              <Button type="submit" appearance="primary" disabled={isSaving} icon={isSaving ? <Spinner size="tiny" /> : undefined}>
                {isSaving ? 'Saving…' : 'Add Account'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
