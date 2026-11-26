import { describe, expect, it } from 'vitest'
import {
  agingBucketForDays,
  mapPayable,
  mapPayableCollection,
  mapPayableDetail,
  normalizeAgingBucket,
  normalizePayableStatus,
  readHasNext,
  toPayableVendorOptions,
} from '../../../services/payables/payables.mappers'
import { overduePayable, overduePayableDetail, partialPayableDetail, sparsePayable, sparsePayableDetail } from '../../../test/fixtures/payables'
import { vendor } from '../../../test/fixtures/vendors'

// AP bill 4 exactly as GetAllApBills returns it
const billDto = {
  id: 4, number: 'BILL-0020', vendor_Id: 3, vehicle_Id: null, vendor_Name: 'Honda Auto Parts',
  date: '2024-03-12T00:00:00', due_Date: '2024-04-26T00:00:00', amount: 12400.0, paid: 0.0, balance: 12400.0,
  days_Overdue: 943, aging_Bucket: 'Over 90', status: 'Overdue', vendor_Balance: 12400.0, payments: [],
}

describe('mapPayable', () => {
  it('maps a GetAllApBills row', () => {
    expect(mapPayable(billDto)).toEqual(overduePayable)
  })

  it('accepts PascalCase spellings', () => {
    expect(mapPayable({ Id: '4', Number: 'BILL-0020', VendorId: '3', VendorName: 'Honda Auto Parts', Date: '2024-03-12',
      DueDate: '2024-04-26', Amount: '12400', Paid: 0, Balance: 12400, DaysOverdue: 943, AgingBucket: 'over 90', Status: 'OVERDUE' }))
      .toEqual(overduePayable)
  })

  it('falls back to empty values for a non-object or missing fields', () => {
    expect(mapPayable(null)).toEqual(sparsePayable)
    expect(mapPayable({ amount: 'abc', days_Overdue: -3 })).toEqual(sparsePayable)
  })
})

// AP bills 4 and 11 exactly as GetApById returns them
const detailDto = {
  id: 4, number: 'BILL-0020', vendorId: 3, vendor: 'Honda Auto Parts', vehicleId: null, date: '2024-03-12T00:00:00',
  dueDate: '2024-04-26T00:00:00', amount: 12400.0, paid: 0.0, balance: 12400.0, days: 943, status: 'Unpaid',
  contact: 'Sam Nguyen', phone: '(800) 555-0312', email: 'parts@honda.com', address: '700 Parts Ave, Columbus OH',
}
const partialDetailDto = {
  id: 11, number: 'AP-2026-000011', vendorId: 1, vendor: 'ABC Auto Auction', vehicleId: 1807, date: '2026-11-25T00:00:00',
  dueDate: '2026-11-30T00:00:00', amount: 52320.0, paid: 5000.0, balance: 47320.0, days: 0, status: 'partial',
  contact: 'Mark Reynolds', phone: '(800) 555-0101', email: 'sales@abcauto.com', address: '500 Auction Blvd, Dallas TX',
}

describe('mapPayableDetail', () => {
  it('maps a GetApById response, deriving Overdue from the days', () => {
    expect(mapPayableDetail(detailDto)).toEqual(overduePayableDetail)
  })

  it('keeps the stored status when not yet due, and the vehicle id', () => {
    expect(mapPayableDetail(partialDetailDto)).toEqual(partialPayableDetail)
  })

  it('never calls a settled bill overdue', () => {
    expect(mapPayableDetail({ ...detailDto, paid: 12400, balance: 0, status: 'Paid' }).status).toBe('Paid')
  })

  it('falls back to empty values for a non-object', () => {
    expect(mapPayableDetail(undefined)).toEqual(sparsePayableDetail)
  })
})

describe('normalizePayableStatus', () => {
  it.each([
    ['Overdue', 'Overdue'], ['partial', 'Partial'], ['unpaid', 'Unpaid'], ['Unpaid', 'Unpaid'], ['PAID', 'Paid'], [undefined, 'Unpaid'], ['odd', 'Unpaid'],
  ] as const)('%s -> %s', (value, expected) => {
    expect(normalizePayableStatus(value)).toBe(expected)
  })
})

describe('aging buckets', () => {
  it.each([[0, 'Current'], [1, '1-30'], [30, '1-30'], [31, '31-60'], [60, '31-60'], [61, '61-90'], [90, '61-90'], [91, 'Over 90']] as const)(
    '%i days -> %s', (days, bucket) => {
      expect(agingBucketForDays(days)).toBe(bucket)
    },
  )

  it('keeps a known bucket and derives an unknown or missing one from the days', () => {
    expect(normalizeAgingBucket('1-30', 4)).toBe('1-30')
    expect(normalizeAgingBucket('OVER 90', 100)).toBe('Over 90')
    expect(normalizeAgingBucket('91+', 100)).toBe('Over 90')
    expect(normalizeAgingBucket(undefined, 45)).toBe('31-60')
  })
})

describe('mapPayableCollection', () => {
  it('unwraps the items envelope and skips non-object rows', () => {
    expect(mapPayableCollection({ items: [billDto, 'x', null] })).toEqual([overduePayable])
  })

  it('accepts a bare array and returns [] for anything else', () => {
    expect(mapPayableCollection([billDto])).toEqual([overduePayable])
    expect(mapPayableCollection('nope')).toEqual([])
  })
})

describe('readHasNext', () => {
  it('reads metaData.hasNext and returns null when it is missing', () => {
    expect(readHasNext({ metaData: { hasNext: true } })).toBe(true)
    expect(readHasNext({ MetaData: { HasNext: false } })).toBe(false)
    expect(readHasNext({ items: [] })).toBeNull()
    expect(readHasNext(null)).toBeNull()
  })
})

describe('toPayableVendorOptions', () => {
  it('keeps vendors with an id, of every type, sorted by name', () => {
    const options = toPayableVendorOptions([
      { ...vendor, id: '3', name: 'Honda Auto Parts', type: 'parts' },
      { ...vendor, id: '', name: 'No Id Motors' },
      { ...vendor, id: '4', name: 'AutoNation Wholesale', type: 'vehicles' },
    ])
    expect(options).toEqual([{ id: '4', name: 'AutoNation Wholesale' }, { id: '3', name: 'Honda Auto Parts' }])
  })
})
