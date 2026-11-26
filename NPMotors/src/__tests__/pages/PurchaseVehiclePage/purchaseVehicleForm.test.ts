import { describe, expect, it } from 'vitest'
import {
  bankAccountLabel,
  emptyPurchaseForm,
  firstStepWithError,
  MAX_YEAR,
  validateStep,
} from '../../../pages/PurchaseVehiclePage/purchaseVehicleForm'
import { vehicleBankAccountOptions, vehiclePurchaseFormValues } from '../../../test/fixtures/vehicles'
import type { VehiclePurchaseFormValues } from '../../../types/vehicles'

const valid = vehiclePurchaseFormValues
const withValues = (overrides: Partial<VehiclePurchaseFormValues>): VehiclePurchaseFormValues => ({ ...valid, ...overrides })

describe('emptyPurchaseForm', () => {
  it('starts on today, the first warehouse, paid in full by transfer', () => {
    const form = emptyPurchaseForm()
    expect(form.purchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(form).toMatchObject({ warehouse: 'WH-A', paymentCondition: 'paidInFull', paymentMethod: 'transfer', vendorId: '', vin: '' })
  })
})

describe('validateStep', () => {
  it('accepts the filled-in fixture on every step', () => {
    for (const step of [1, 2, 3, 4] as const) expect(validateStep(step, valid)).toEqual({})
  })

  describe('step 1: vehicle info', () => {
    it('requires the design\'s required fields', () => {
      expect(validateStep(1, emptyPurchaseForm())).toEqual({
        vendorId: 'Select a vendor',
        make: 'Make is required',
        model: 'Model is required',
        year: `Enter a year from 1900 to ${MAX_YEAR}`,
        vin: 'VIN is required',
      })
    })

    it('checks the year range and the VIN length', () => {
      expect(validateStep(1, withValues({ year: String(MAX_YEAR + 1) })).year).toBeDefined()
      expect(validateStep(1, withValues({ year: '2024.5' })).year).toBeDefined()
      expect(validateStep(1, withValues({ vin: 'ABC123' })).vin).toBe('VIN must be exactly 17 characters')
    })
  })

  describe('step 2: costs', () => {
    it('requires a purchase price greater than zero', () => {
      expect(validateStep(2, withValues({ purchasePrice: '' })).purchasePrice).toBe('Purchase price is required')
      expect(validateStep(2, withValues({ purchasePrice: '0' })).purchasePrice).toBe('Purchase price must be greater than zero')
    })

    it('rejects negative, non-numeric and sub-cent amounts', () => {
      expect(validateStep(2, withValues({ salesTax: '-5' })).salesTax).toBe('Sales tax cannot be negative')
      expect(validateStep(2, withValues({ transportCost: 'abc' })).transportCost).toBe('Enter a valid amount')
      expect(validateStep(2, withValues({ otherCosts: '1.005' })).otherCosts).toBe('Use at most two decimal places')
    })

    it('lets the optional costs and list price stay blank', () => {
      expect(validateStep(2, withValues({ salesTax: '', transportCost: '', otherCosts: '', sellingPrice: '' }))).toEqual({})
    })
  })

  describe('step 3: payment', () => {
    it('needs a bank account whenever something is paid', () => {
      expect(validateStep(3, withValues({ bankAccountId: '' })).bankAccountId).toBe('Select the account to pay from')
      expect(validateStep(3, withValues({ bankAccountId: '', paymentCondition: 'credit' }))).toEqual({})
    })

    it('keeps a partial payment above zero and below the total', () => {
      const partial = (amountPaid: string) => validateStep(3, withValues({ paymentCondition: 'partial', amountPaid })).amountPaid
      expect(partial('')).toBe('Amount paid is required')
      expect(partial('0')).toBe('Amount paid must be greater than zero')
      // The fixture's total is $31,200.10
      expect(partial('31200.10')).toBe('A partial payment must be less than the total cost')
      expect(partial('31200.09')).toBeUndefined()
    })

    it('does not allow an AP due date before the purchase date', () => {
      expect(validateStep(3, withValues({ paymentCondition: 'credit', dueDate: '2026-11-01' })).dueDate).toBe('Due date cannot be before the purchase date')
      expect(validateStep(3, withValues({ paymentCondition: 'credit', dueDate: '2026-12-01' }))).toEqual({})
      // Paid in full leaves nothing owed, so its due date is ignored
      expect(validateStep(3, withValues({ dueDate: '2020-01-01' }))).toEqual({})
    })
  })
})

describe('firstStepWithError', () => {
  it('returns the earliest step holding an error, or null', () => {
    expect(firstStepWithError({})).toBeNull()
    expect(firstStepWithError({ bankAccountId: 'x', purchasePrice: 'y' })).toBe(2)
    expect(firstStepWithError({ dueDate: 'x', vin: 'y' })).toBe(1)
    expect(firstStepWithError({ amountPaid: 'x' })).toBe(3)
  })
})

describe('bankAccountLabel', () => {
  it('shows the bank, account and balance, leaving out a missing bank', () => {
    expect(bankAccountLabel(vehicleBankAccountOptions[0]!)).toBe('Chase — Operating ($120,000.00)')
    expect(bankAccountLabel(vehicleBankAccountOptions[1]!)).toBe('Payroll ($5,000.50)')
  })
})
