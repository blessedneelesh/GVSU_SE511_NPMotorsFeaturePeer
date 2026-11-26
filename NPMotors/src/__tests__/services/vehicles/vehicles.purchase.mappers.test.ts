import { describe, expect, it } from 'vitest'
import {
  amountPaidCents,
  mapVehiclePurchaseResult,
  toCents,
  toVehicleBankAccountOptions,
  toVehiclePurchaseDto,
  totalCostCents,
} from '../../../services/vehicles/vehicles.mappers'
import { vehiclePurchaseFormValues } from '../../../test/fixtures/vehicles'
import type { BankAccount } from '../../../types/bankAccounts'

describe('toCents', () => {
  it.each([
    ['30000', 3000000],
    ['0.1', 10],
    ['1200.10', 120010],
    [' 5 ', 500],
    ['', 0],
    ['abc', 0],
  ])('converts %j to %d cents', (value, cents) => {
    expect(toCents(value)).toBe(cents)
  })
})

describe('totalCostCents / amountPaidCents', () => {
  it('adds the price and the three cost inputs exactly', () => {
    // 0.1 + 0.2 in floating point is 0.30000000000000004; the cents sum is exact
    expect(totalCostCents({ ...vehiclePurchaseFormValues, purchasePrice: '0.1', salesTax: '0.2', transportCost: '', otherCosts: '' })).toBe(30)
    expect(totalCostCents(vehiclePurchaseFormValues)).toBe(3120010)
  })

  it('pays the total in full, the entered amount for partial, and nothing on credit', () => {
    expect(amountPaidCents(vehiclePurchaseFormValues)).toBe(3120010)
    expect(amountPaidCents({ ...vehiclePurchaseFormValues, paymentCondition: 'partial', amountPaid: '10000' })).toBe(1000000)
    expect(amountPaidCents({ ...vehiclePurchaseFormValues, paymentCondition: 'credit', amountPaid: '10000' })).toBe(0)
  })
})

describe('toVehiclePurchaseDto', () => {
  it('builds a paid-in-full purchase whose amount equals price + additional costs', () => {
    expect(toVehiclePurchaseDto(vehiclePurchaseFormValues)).toEqual({
      vendor_Id: 1,
      vin: '1FTFW1E50PFA00001',
      make: 'Ford',
      model: 'F-150',
      year: 2024,
      color: 'Blue',
      purchase_Date: '2026-11-02',
      warehouse: 'WH-B',
      purchase_Price: 30000,
      additional_Costs: 1200.1,
      selling_Price: 36000,
      payment_Condition: 'PaidInFull',
      amount_Paid: 31200.1,
      payment_Method: 'Transfer',
      reference: 'TRF-1001',
      bank_Account_Id: 3,
      due_Date: null,
    })
  })

  it('serializes amounts without floating-point noise', () => {
    const dto = toVehiclePurchaseDto({ ...vehiclePurchaseFormValues, purchasePrice: '0.1', salesTax: '0.2', transportCost: '', otherCosts: '' })
    expect(JSON.stringify(dto)).toContain('"amount_Paid":0.3,')
    expect(dto.amount_Paid).toBe(0.3)
  })

  it('sends a partial payment with its due date', () => {
    const dto = toVehiclePurchaseDto({ ...vehiclePurchaseFormValues, paymentCondition: 'partial', amountPaid: '10000', paymentMethod: 'check', dueDate: '2026-12-02' })
    expect(dto).toMatchObject({ payment_Condition: 'Partial', amount_Paid: 10000, payment_Method: 'Check', bank_Account_Id: 3, due_Date: '2026-12-02' })
  })

  it('sends a credit purchase with no payment details', () => {
    const dto = toVehiclePurchaseDto({ ...vehiclePurchaseFormValues, paymentCondition: 'credit', dueDate: '2026-12-02' })
    expect(dto).toMatchObject({
      payment_Condition: 'Credit',
      amount_Paid: 0,
      payment_Method: null,
      reference: null,
      bank_Account_Id: null,
      due_Date: '2026-12-02',
    })
  })

  it('sends blank optional fields as null and blank costs as zero', () => {
    const dto = toVehiclePurchaseDto({
      ...vehiclePurchaseFormValues, color: '', sellingPrice: '', reference: ' ', salesTax: '', transportCost: '', otherCosts: '',
    })
    expect(dto).toMatchObject({ color: null, selling_Price: null, reference: null, additional_Costs: 0, amount_Paid: 30000 })
  })
})

describe('mapVehiclePurchaseResult', () => {
  // What PurchaseVehicle sends today: Total_Cost is left at 0, so Balance_Due is -Amount_Paid
  const response = {
    id: 31, vendor_Id: 1, vin: '1FTFW1E50PFA00001', make: 'Ford', model: 'F-150', year: 2024,
    purchase_Price: 30000, additional_Costs: 1200.1, total_Cost: 0, selling_Price: 36000, status: 'available',
    payment_Condition: 'Partial', amount_Paid: 10000, balance_Due: -10000, payment_Status: 'Partial',
    ap_Bill_Id: 9, ap_Bill_Number: 'AP-0042', bank_Payment_Id: 4, payment_Number: 'BP-0012',
  }

  it('works out the total and balance from the stored price and costs', () => {
    expect(mapVehiclePurchaseResult(response)).toEqual({
      vehicleId: '31',
      title: '2024 Ford F-150',
      totalCost: 31200.1,
      amountPaid: 10000,
      balanceDue: 21200.1,
      paymentStatus: 'partial',
      apBillNumber: 'AP-0042',
      paymentNumber: 'BP-0012',
    })
  })

  it('uses Total_Cost when the API sends one', () => {
    expect(mapVehiclePurchaseResult({ ...response, total_Cost: 40000 }).totalCost).toBe(40000)
  })

  it('never shows a negative balance and survives a body that is not an object', () => {
    expect(mapVehiclePurchaseResult({ ...response, amount_Paid: 99999 }).balanceDue).toBe(0)
    expect(mapVehiclePurchaseResult(null)).toMatchObject({ vehicleId: '', totalCost: 0, amountPaid: 0, balanceDue: 0, apBillNumber: '' })
  })
})

describe('toVehicleBankAccountOptions', () => {
  const account = (overrides: Partial<BankAccount>): BankAccount => ({
    id: '1', bankId: '1', bankName: 'Chase', name: 'Operating', accountNumber: '1234', type: 'Checking', routing: '', bookBalance: 100, status: 'Active',
    ...overrides,
  })

  it('keeps active accounts with an id', () => {
    expect(toVehicleBankAccountOptions([
      account({ id: '1' }),
      account({ id: '2', status: 'Inactive' }),
      account({ id: '' }),
    ])).toEqual([{ id: '1', name: 'Operating', bankName: 'Chase', bookBalance: 100 }])
  })
})
