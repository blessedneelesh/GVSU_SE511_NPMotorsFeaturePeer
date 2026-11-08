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
  Spinner,
  Textarea,
} from '@fluentui/react-components'
import { useTransferAccountOptions } from '../../hooks/useTransferAccountOptions'
import { useTransferMutations } from '../../hooks/useTransferMutations'
import type { TransferFieldErrors, TransferFormField, TransferFormValues } from '../../types/transfers'
import { accountLabel, formatAmount, todayIsoDate } from './transferMetrics'

const SAME_ACCOUNT_MESSAGE = 'Choose a different destination account.'
const EXCEEDS_BALANCE_MESSAGE = 'Transfer amount exceeds the source account balance.'

// CreateTransferRequest caps description at 500 characters
const MAX_DESCRIPTION_LENGTH = 500

const emptyForm = (): TransferFormValues => ({
  sourceAccountId: '',
  destinationAccountId: '',
  date: todayIsoDate(),
  amount: '',
  description: '',
})

// Required fields follow the Figma design: both accounts, date and a positive amount
function validate(values: TransferFormValues, sourceBalance: number | undefined): TransferFieldErrors {
  const errors: TransferFieldErrors = {}
  if (!values.sourceAccountId) errors.sourceAccountId = 'Select the account to transfer from'
  if (!values.destinationAccountId) errors.destinationAccountId = 'Select the account to transfer to'
  else if (values.destinationAccountId === values.sourceAccountId) errors.destinationAccountId = SAME_ACCOUNT_MESSAGE
  if (!values.date) errors.date = 'Transfer date is required'

  const amount = Number(values.amount)
  if (!values.amount.trim()) errors.amount = 'Amount is required'
  else if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than zero'
  else if (!/^\d+(\.\d{1,2})?$/.test(values.amount.trim())) errors.amount = 'Use at most two decimal places'
  else if (sourceBalance !== undefined && amount > sourceBalance) errors.amount = EXCEEDS_BALANCE_MESSAGE
  return errors
}

// The New Transfer card and its preview. Inline on the page, as in the design, rather than a dialog.
export function TransferForm() {
  const { saveStatus, saveError, fieldErrors, create } = useTransferMutations()
  const { accountOptions, accountOptionsStatus, accountOptionsError, retry: retryAccounts } = useTransferAccountOptions()
  const [entered, setEntered] = useState<TransferFormValues>(emptyForm)
  const [clientErrors, setClientErrors] = useState<TransferFieldErrors>({})
  // Server errors stay in Redux until the next submit; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<TransferFormField>>(new Set())
  const isSaving = saveStatus === 'loading'
  // A reload keeps the previous accounts, so only an empty list blocks the dropdowns
  const isLoadingAccounts = (accountOptionsStatus === 'loading' || accountOptionsStatus === 'idle') && accountOptions.length === 0

  // After a successful post, keep the accounts and date but clear the amount and description for the next transfer
  const [seenSaveStatus, setSeenSaveStatus] = useState(saveStatus)
  if (saveStatus !== seenSaveStatus) {
    setSeenSaveStatus(saveStatus)
    if (saveStatus === 'success') setEntered((current) => ({ ...current, amount: '', description: '' }))
  }

  // As in the design, From and To default to the first two accounts until the user picks
  const values: TransferFormValues = {
    ...entered,
    sourceAccountId: entered.sourceAccountId || (accountOptions[0]?.id ?? ''),
    destinationAccountId: entered.destinationAccountId || (accountOptions[1]?.id ?? ''),
  }
  const source = accountOptions.find((account) => account.id === values.sourceAccountId)
  const destination = accountOptions.find((account) => account.id === values.destinationAccountId)
  const amount = Number(values.amount)
  const previewAmount = Number.isFinite(amount) && amount > 0 ? amount : 0

  // Shown while typing, like the design; everything else waits for submit
  const liveErrors: TransferFieldErrors = {
    destinationAccountId: values.sourceAccountId && values.sourceAccountId === values.destinationAccountId ? SAME_ACCOUNT_MESSAGE : undefined,
    amount: source && amount > source.bookBalance ? EXCEEDS_BALANCE_MESSAGE : undefined,
  }

  const errorFor = (field: TransferFormField) =>
    clientErrors[field] ?? liveErrors[field] ?? (editedFields.has(field) ? undefined : fieldErrors[field])

  const setField = (field: TransferFormField, value: string) => {
    setEntered((current) => ({ ...current, [field]: value }))
    setClientErrors((current) => ({ ...current, [field]: undefined }))
    setEditedFields((current) => new Set(current).add(field))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validate(values, source?.bookBalance)
    setClientErrors(errors)
    if (Object.keys(errors).length) return
    setEditedFields(new Set())
    create(values)
  }

  const accountField = (field: 'sourceAccountId' | 'destinationAccountId', label: string, balanceLabel: string) => {
    const selected = field === 'sourceAccountId' ? source : destination
    return (
      <Field
        label={label}
        required
        validationState={errorFor(field) ? 'error' : 'none'}
        validationMessage={errorFor(field)}
        hint={<>{balanceLabel}: <span className="mono strong">{formatAmount(selected?.bookBalance ?? 0)}</span></>}
      >
        <Dropdown
          placeholder={isLoadingAccounts ? 'Loading accounts…' : 'Select an account'}
          value={selected ? accountLabel(selected) : ''}
          selectedOptions={values[field] ? [values[field]] : []}
          disabled={isLoadingAccounts || accountOptions.length === 0}
          onOptionSelect={(_, data) => { if (data.optionValue) setField(field, data.optionValue) }}
        >
          {accountOptions.map((account) => <Option key={account.id} value={account.id}>{accountLabel(account)}</Option>)}
        </Dropdown>
      </Field>
    )
  }

  return (
    <div className="transfers-grid">
      <form className="card transfer-form" onSubmit={handleSubmit} noValidate aria-labelledby="transfer-form-title">
        <header className="transfer-form__header">
          <div>
            <h2 id="transfer-form-title">New Transfer</h2>
            <p>Both account updates are posted together</p>
          </div>
          <span className="badge badge-draft">Unreconciled</span>
        </header>

        {saveError && (
          <MessageBar intent="error" className="transfer-form__message">
            <MessageBarBody>{saveError}</MessageBarBody>
          </MessageBar>
        )}

        {accountOptionsStatus === 'error' && (
          <MessageBar intent="warning" className="transfer-form__message">
            <MessageBarBody>{accountOptionsError}</MessageBarBody>
            <MessageBarActions>
              <Button size="small" onClick={retryAccounts}>Retry</Button>
            </MessageBarActions>
          </MessageBar>
        )}

        <fieldset className="transfer-form__fields" disabled={isSaving}>
          {accountField('sourceAccountId', 'From Account', 'Available')}
          {accountField('destinationAccountId', 'To Account', 'Current balance')}
          <Field label="Transfer Date" required validationState={errorFor('date') ? 'error' : 'none'} validationMessage={errorFor('date')}>
            <Input type="date" value={values.date} onChange={(_, data) => setField('date', data.value)} />
          </Field>
          <Field
            className="transfer-form__wide"
            label="Amount"
            required
            validationState={errorFor('amount') ? 'error' : 'none'}
            validationMessage={errorFor('amount')}
          >
            <Input
              className="mono transfer-form__amount"
              type="number"
              min={0}
              step={0.01}
              value={values.amount}
              placeholder="0.00"
              onChange={(_, data) => setField('amount', data.value)}
            />
          </Field>
          <Field
            className="transfer-form__wide"
            label="Description"
            validationState={errorFor('description') ? 'error' : 'none'}
            validationMessage={errorFor('description')}
          >
            <Textarea
              rows={3}
              resize="vertical"
              value={values.description}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Purpose of this transfer"
              onChange={(_, data) => setField('description', data.value)}
            />
          </Field>
        </fieldset>

        <footer className="transfer-form__footer">
          <Button type="submit" appearance="primary" disabled={isSaving || isLoadingAccounts} icon={isSaving ? <Spinner size="tiny" /> : undefined}>
            {isSaving ? 'Posting…' : 'Post Transfer'}
          </Button>
        </footer>
      </form>

      <aside className="transfers-side">
        <section className="card transfer-preview" aria-label="Transfer preview">
          <h3>Transfer Preview</h3>
          <div className="transfer-preview__leg transfer-preview__leg--out">
            <div className="transfer-preview__label">Outgoing</div>
            <div className="transfer-preview__account">{source?.name ?? 'Source account'}</div>
            <div className="transfer-preview__amount">−{formatAmount(previewAmount)}</div>
          </div>
          <div className="transfer-preview__leg transfer-preview__leg--in">
            <div className="transfer-preview__label">Incoming</div>
            <div className="transfer-preview__account">{destination?.name ?? 'Destination account'}</div>
            <div className="transfer-preview__amount">+{formatAmount(previewAmount)}</div>
          </div>
        </section>

        <section className="card transfer-result" aria-label="Posting result">
          <h3>Posting Result</h3>
          <ul>
            <li>Two posted transactions, one per account.</li>
            <li>Source book balance decreases.</li>
            <li>Destination book balance increases.</li>
            <li>Each account gets a Transfer line on its bank statement.</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}
