import { describe, expect, it } from 'vitest'
import {
  mapReceivable,
  mapReceivableCollection,
  mapReceivableDetail,
  normalizeAgingStatus,
  readHasNext,
  toReceivableCustomerOptions,
} from '../../../services/receivables/receivables.mappers'
import {
  overdueReceivable,
  paidReceivableDetail,
  partialReceivable,
  receivableDetail,
  sparseReceivableDetail,
} from '../../../test/fixtures/receivables'
import type { Customer } from '../../../types/customers'

// Rows exactly as GET Ar/GetAllAr returned them from the running API
const overdueDto = {
  id: 2, number: 'SI-0005', customerId: 7, customer_Name: 'David Taylor', invoice_Number: 'SI-0005',
  due_Date: '2024-03-22T00:00:00', amount: 18400.0, paid: 0.0, balance: 18400.0, status: 'Overdue', days_Overdue: 967, aging_Status: 'Overdue',
}
const partialDto = {
  id: 3975, number: 'AR-003975', customerId: 8, customer_Name: 'Lisa Anderson', invoice_Number: 'INV-006249',
  due_Date: '2026-12-13T00:00:00', amount: 19890.0, paid: 1200.0, balance: 18690.0, status: 'partial', days_Overdue: 0, aging_Status: 'partial',
}

// Bodies exactly as GET Ar/GetArById?id=… returned them from the running API
const detailDto = {
  id: 2471, invoiceId: 4262, number: 'AR-002471', customer: 'Jennifer Brown', date: '2026-11-08T00:00:00', dueDate: '2026-11-08T00:00:00',
  amount: 29350.0, paid: 1850.0, balance: 27500.0, days: 7, status: 'partial', invoice_Total: 29350.0, invoice_Date: '2026-11-08T00:00:00',
  phone: '(972) 555-0784', email: 'jbrown@email.com', address: '2240 Cedar Blvd',
}
const paidDetailDto = {
  id: 4, invoiceId: 9, number: 'SI-0009', customer: 'John Smith', date: '2024-03-25T00:00:00', dueDate: '2024-04-24T00:00:00',
  amount: 58742.0, paid: 58742.0, balance: 0.0, days: 935, status: 'paid', invoice_Total: 58742.0, invoice_Date: '2024-03-25T00:00:00',
  phone: '(214) 555-0201', email: 'john.smith@email.com', address: '4521 Oak Lane',
}

describe('receivables mappers', () => {
  it('maps the API rows', () => {
    expect(mapReceivable(overdueDto)).toEqual(overdueReceivable)
    expect(mapReceivable(partialDto)).toEqual(partialReceivable)
  })

  it('unwraps the items envelope and reads metaData.hasNext', () => {
    const body = { items: [overdueDto, 'junk', partialDto], metaData: { currentPage: 1, hasNext: true } }
    expect(mapReceivableCollection(body)).toEqual([overdueReceivable, partialReceivable])
    expect(readHasNext(body)).toBe(true)
    expect(readHasNext({ items: [] })).toBeNull()
  })

  it('falls back to empty values for a bad row', () => {
    expect(mapReceivable(null)).toEqual({
      id: '', number: '', customerId: '', customerName: '', invoiceNumber: '', dueDate: '',
      amount: 0, paid: 0, balance: 0, daysOverdue: 0, agingStatus: 'Unpaid',
    })
  })

  it('derives the aging status when aging_Status is missing', () => {
    expect(mapReceivable({ status: 'partial', days_Overdue: 3 }).agingStatus).toBe('Overdue')
    expect(mapReceivable({ status: 'partial', days_Overdue: 0 }).agingStatus).toBe('Partial')
    // A paid invoice stays Paid however long ago it was due
    expect(mapReceivable({ status: 'paid', days_Overdue: 934 }).agingStatus).toBe('Paid')
  })

  it('maps GetArById responses, deriving the aging status from status and days', () => {
    expect(mapReceivableDetail(detailDto)).toEqual(receivableDetail)
    expect(mapReceivableDetail(paidDetailDto)).toEqual(paidReceivableDetail)
  })

  it('falls back to empty values for a bad GetArById body', () => {
    expect(mapReceivableDetail('Not Found')).toEqual(sparseReceivableDetail)
  })

  it.each([
    ['Overdue', 'Overdue'], ['overdue', 'Overdue'], ['Partial', 'Partial'], ['partial', 'Partial'],
    ['paid', 'Paid'], ['unpaid', 'Unpaid'], ['Unpaid', 'Unpaid'], [undefined, 'Unpaid'],
  ])('normalizes %s to %s', (value, expected) => {
    expect(normalizeAgingStatus(value)).toBe(expected)
  })

  it('builds sorted customer options and drops customers without an id', () => {
    const customer = (id: string, fullName: string) => ({ id, fullName }) as Customer
    expect(toReceivableCustomerOptions([customer('2', 'Sarah Johnson'), customer('', 'Ghost'), customer('7', 'David Taylor')]))
      .toEqual([{ id: '7', name: 'David Taylor' }, { id: '2', name: 'Sarah Johnson' }])
  })
})
