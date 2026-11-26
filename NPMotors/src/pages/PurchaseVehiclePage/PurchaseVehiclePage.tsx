import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, MessageBar, MessageBarBody, MessageBarTitle, Spinner } from '@fluentui/react-components'
import { useVehicleBankAccountOptions } from '../../hooks/useVehicleBankAccountOptions'
import { useVehiclePurchase } from '../../hooks/useVehiclePurchase'
import { useVehicleVendorOptions } from '../../hooks/useVehicleVendorOptions'
import { totalCostCents } from '../../services/vehicles/vehicles.mappers'
import type { VehiclePurchaseFieldErrors, VehiclePurchaseFormField, VehiclePurchaseFormValues } from '../../types/vehicles'
import {
  emptyPurchaseForm,
  firstStepWithError,
  formatAmount,
  PURCHASE_STEPS,
  type PurchaseStep,
  validateStep,
  WORKFLOW_ITEMS,
} from './purchaseVehicleForm'
import { CostsStep, PaymentStep, ReviewStep, type SetPurchaseField, VehicleInfoStep } from './PurchaseVehicleSteps'
import './PurchaseVehiclePage.css'

const INVENTORY_PATH = '/vehicle-inventory'

const NEXT_LABELS: Record<Exclude<PurchaseStep, 4>, string> = {
  1: 'Next: Costs →',
  2: 'Next: Payment →',
  3: 'Next: Review →',
}

// The design's four-step purchase wizard. Posting adds the vehicle and records the payment and/or AP bill in one
// call, then returns to Vehicle Inventory, which confirms the purchase.
export function PurchaseVehiclePage() {
  const navigate = useNavigate()
  const { purchaseStatus, purchaseError, purchaseFieldErrors, purchase, resetPurchase } = useVehiclePurchase()
  const { vendorOptions, vendorOptionsStatus, vendorOptionsError, retry: retryVendors } = useVehicleVendorOptions()
  const { bankAccountOptions, bankAccountOptionsStatus, bankAccountOptionsError, retry: retryBankAccounts } = useVehicleBankAccountOptions()
  const [values, setValues] = useState<VehiclePurchaseFormValues>(emptyPurchaseForm)
  const [step, setStep] = useState<PurchaseStep>(1)
  const [clientErrors, setClientErrors] = useState<VehiclePurchaseFieldErrors>({})
  // Server errors stay in Redux until the next post; hide each one as soon as its field is edited
  const [editedFields, setEditedFields] = useState<ReadonlySet<VehiclePurchaseFormField>>(new Set())
  // Set once this visit posts, so a success left over from an earlier purchase can't trigger the redirect
  const [hasPosted, setHasPosted] = useState(false)
  const isPosting = purchaseStatus === 'loading'

  // Start from a clean purchase status (and clear the inventory's confirmation banner)
  useEffect(() => {
    resetPurchase()
  }, [resetPurchase])

  // A posted purchase returns to the inventory, which shows the confirmation (the result stays in Redux for it)
  useEffect(() => {
    if (hasPosted && purchaseStatus === 'success') navigate(INVENTORY_PATH)
  }, [hasPosted, purchaseStatus, navigate])

  // When the server rejects a field, go back to the step that shows it
  const [seenPurchaseStatus, setSeenPurchaseStatus] = useState(purchaseStatus)
  if (purchaseStatus !== seenPurchaseStatus) {
    setSeenPurchaseStatus(purchaseStatus)
    const errorStep = purchaseStatus === 'error' ? firstStepWithError(purchaseFieldErrors) : null
    if (errorStep) setStep(errorStep)
  }

  const errorFor = (field: VehiclePurchaseFormField) => clientErrors[field] ?? (editedFields.has(field) ? undefined : purchaseFieldErrors[field])

  const setField: SetPurchaseField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setClientErrors((current) => ({ ...current, [field]: undefined }))
    setEditedFields((current) => new Set(current).add(field))
  }

  // Checks the steps before the target in order and stops on the first that has errors, so the user can't skip
  // ahead past an invalid step; going back is always allowed
  const goToStep = (target: PurchaseStep) => {
    for (let current = step; current < target; current++) {
      const errors = validateStep(current as PurchaseStep, values)
      if (Object.keys(errors).length) {
        setClientErrors(errors)
        setStep(current as PurchaseStep)
        return
      }
    }
    setClientErrors({})
    setStep(target)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (step !== 4) {
      goToStep((step + 1) as PurchaseStep)
      return
    }
    // Every step is checked again: a field may have been changed after its step was passed
    const errors = { ...validateStep(1, values), ...validateStep(2, values), ...validateStep(3, values) }
    const errorStep = firstStepWithError(errors)
    if (errorStep) {
      setClientErrors(errors)
      setStep(errorStep)
      return
    }
    setEditedFields(new Set())
    setHasPosted(true)
    purchase(values)
  }

  const vendorName = vendorOptions.find((option) => option.id === values.vendorId)?.name ?? ''
  const bankAccount = values.paymentCondition === 'credit' ? undefined : bankAccountOptions.find((option) => option.id === values.bankAccountId)
  const stepProps = { values, errorFor, setField }

  return (
    <div className="purchase-vehicle-page">
      <nav className="purchase-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={() => navigate(INVENTORY_PATH)}>← Vehicle Inventory</button>
        <span aria-hidden="true">/</span>
        <h1>Purchase Vehicle</h1>
      </nav>

      <ol className="purchase-steps" aria-label="Purchase steps">
        {PURCHASE_STEPS.map(({ step: itemStep, label }, index) => {
          const state = itemStep === step ? 'current' : itemStep < step ? 'done' : 'upcoming'
          return (
            <li key={itemStep} className="purchase-steps__item">
              <button
                type="button"
                className={`purchase-steps__button is-${state}`}
                aria-current={state === 'current' ? 'step' : undefined}
                disabled={isPosting}
                onClick={() => goToStep(itemStep)}
              >
                <span className="purchase-steps__badge" aria-hidden="true">{state === 'done' ? '✓' : itemStep}</span>
                {label}
              </button>
              {index < PURCHASE_STEPS.length - 1 && <span className={`purchase-steps__line ${itemStep < step ? 'is-done' : ''}`} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>

      <div className="purchase-layout">
        <form className="card purchase-card" onSubmit={handleSubmit} noValidate aria-label="Purchase vehicle">
          {step === 4 && purchaseError && (
            <MessageBar intent="error">
              <MessageBarBody>
                <MessageBarTitle>Couldn&apos;t post the purchase</MessageBarTitle>
                {purchaseError}
              </MessageBarBody>
            </MessageBar>
          )}

          <fieldset className="purchase-card__fields" disabled={isPosting}>
            {step === 1 && (
              <VehicleInfoStep
                {...stepProps}
                vendors={{ options: vendorOptions, status: vendorOptionsStatus, error: vendorOptionsError, retry: retryVendors }}
              />
            )}
            {step === 2 && <CostsStep {...stepProps} />}
            {step === 3 && (
              <PaymentStep
                {...stepProps}
                bankAccounts={{ options: bankAccountOptions, status: bankAccountOptionsStatus, error: bankAccountOptionsError, retry: retryBankAccounts }}
              />
            )}
            {step === 4 && <ReviewStep values={values} vendorName={vendorName} bankAccount={bankAccount} />}
          </fieldset>

          <div className={`purchase-card__actions ${step === 1 ? 'is-first' : ''}`}>
            {step > 1 && (
              <Button disabled={isPosting} onClick={() => goToStep((step - 1) as PurchaseStep)}>← Back</Button>
            )}
            {step === 4 ? (
              <Button type="submit" appearance="primary" disabled={isPosting} icon={isPosting ? <Spinner size="tiny" /> : undefined}>
                {isPosting ? 'Posting…' : 'Post & Add to Inventory'}
              </Button>
            ) : (
              <Button type="submit" appearance="primary">{NEXT_LABELS[step]}</Button>
            )}
          </div>
        </form>

        <aside className="purchase-aside">
          <div className="card purchase-total">
            <div className="purchase-total__label">Total Vehicle Cost</div>
            <div className="purchase-total__value mono" aria-live="polite">{formatAmount(totalCostCents(values) / 100)}</div>
          </div>
          <div className="card purchase-workflow">
            <div className="purchase-workflow__title">Workflow</div>
            <ul>
              {WORKFLOW_ITEMS.map((item, index) => (
                <li key={item} className={index < step ? 'is-done' : undefined}>
                  <span aria-hidden="true">{index < step ? '✓' : '○'}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
