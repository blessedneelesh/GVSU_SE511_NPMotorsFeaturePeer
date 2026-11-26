import { describe, expect, it, vi } from 'vitest'
import { customerClient } from '../../../services/api/customerClient'
import { payablesApi } from '../../../services/payables/payables.api'
import { toMiscellaneousPaymentDto } from '../../../services/payables/payables.mappers'
import { vendorPaymentFormValues } from '../../../test/fixtures/payables'

// GetAllApBills rows as the API sends them
const billDto = (id: number, balance: number) => ({
  id, number: `BILL-${id}`, vendor_Id: 4, vendor_Name: 'AutoNation Wholesale', date: '2026-11-24T00:00:00', due_Date: '2026-12-24T00:00:00',
  amount: 52320, paid: 52320 - balance, balance, days_Overdue: 0, aging_Bucket: 'Current', status: 'Partial',
})

describe('payables api: Bank Payments', () => {
  it('posts a miscellaneous payment to RecordMiscellaneousPayment', async () => {
    const post = vi.spyOn(customerClient, 'post').mockResolvedValue({ data: {} })
    const request = { payee: 'City Properties LLC', paymentCategory: 'Rent Expense', description: '', values: vendorPaymentFormValues }
    await payablesApi.recordMiscellaneousPayment(request)
    expect(post).toHaveBeenCalledWith('BankPayment/RecordMiscellaneousPayment', toMiscellaneousPaymentDto(request), { signal: undefined })
  })

  it('loads the vendor\'s open bills in one 100-row page, leaving out settled ones', async () => {
    const get = vi.spyOn(customerClient, 'get').mockResolvedValue({ data: { items: [billDto(11, 47320), billDto(12, 0)], metaData: { hasNext: false } } })
    const signal = new AbortController().signal
    const bills = await payablesApi.getVendorBills('4', signal)
    expect(bills.map((bill) => bill.id)).toEqual(['11'])
    expect(get).toHaveBeenCalledWith('APBill/GetAllApBills', { params: { PageNumber: 1, PageSize: 100, VendorId: '4' }, signal })
  })
})
