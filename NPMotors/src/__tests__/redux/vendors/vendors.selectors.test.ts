import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/vendors/vendors.selectors'
import { makeVendorState } from '../../../test/test-utils'
import { vendor, vendorPage } from '../../../test/fixtures/vendors'

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeVendorState({
  items: vendorPage.items,
  hasNext: true,
  query: { pageNumber: 2, pageSize: 10, type: 'parts', searchTerm: 'detroit' },
  listStatus: 'success',
  listError: 'list error',
  selectedId: '5',
  selected: vendor,
  detailStatus: 'error',
  detailError: 'detail error',
  saveStatus: 'loading',
  saveError: 'save error',
  fieldErrors: { name: 'The Name field is required.' },
})

describe('vendors selectors', () => {
  it('selectVendorState returns the slice', () => {
    expect(selectors.selectVendorState(state)).toBe(state.vendors)
  })

  it.each([
    ['selectVendors', selectors.selectVendors, vendorPage.items],
    ['selectVendorHasNext', selectors.selectVendorHasNext, true],
    ['selectVendorQuery', selectors.selectVendorQuery, { pageNumber: 2, pageSize: 10, type: 'parts', searchTerm: 'detroit' }],
    ['selectVendorListStatus', selectors.selectVendorListStatus, 'success'],
    ['selectVendorListError', selectors.selectVendorListError, 'list error'],
    ['selectSelectedVendorId', selectors.selectSelectedVendorId, '5'],
    ['selectSelectedVendor', selectors.selectSelectedVendor, vendor],
    ['selectVendorDetailStatus', selectors.selectVendorDetailStatus, 'error'],
    ['selectVendorDetailError', selectors.selectVendorDetailError, 'detail error'],
    ['selectVendorSaveStatus', selectors.selectVendorSaveStatus, 'loading'],
    ['selectVendorSaveError', selectors.selectVendorSaveError, 'save error'],
    ['selectVendorFieldErrors', selectors.selectVendorFieldErrors, { name: 'The Name field is required.' }],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectVendors(state)).toBe(selectors.selectVendors(state))
      expect(selectors.selectVendorQuery(state)).toBe(selectors.selectVendorQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectVendors(state)
      const next = { ...state, vendors: { ...state.vendors, listStatus: 'loading' as const } }
      expect(selectors.selectVendors(next)).toBe(before)
    })

    it('keeps the items reference when only the customers slice changes', () => {
      const before = selectors.selectVendors(state)
      const next = { ...state, customers: { ...state.customers, listStatus: 'loading' as const } }
      expect(selectors.selectVendors(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, vendors: { ...state.vendors, items: [vendor] } }
      expect(selectors.selectVendors(next)).toEqual([vendor])
    })
  })
})
