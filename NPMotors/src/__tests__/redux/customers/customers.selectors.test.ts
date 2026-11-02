import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/customers/customers.selectors'
import { makeState } from '../../../test/test-utils'
import { customer, customerPage } from '../../../test/fixtures/customers'

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeState({
  items: customerPage.items,
  hasNext: true,
  query: { pageNumber: 2, pageSize: 10, status: 'active', searchTerm: 'smith' },
  listStatus: 'success',
  listError: 'list error',
  selectedId: 'C001',
  selected: customer,
  detailStatus: 'error',
  detailError: 'detail error',
  saveStatus: 'loading',
  saveError: 'save error',
  fieldErrors: { email: 'Email already exists' },
})

describe('customers selectors', () => {
  it('selectCustomerState returns the slice', () => {
    expect(selectors.selectCustomerState(state)).toBe(state.customers)
  })

  it.each([
    ['selectCustomers', selectors.selectCustomers, customerPage.items],
    ['selectCustomerHasNext', selectors.selectCustomerHasNext, true],
    ['selectCustomerQuery', selectors.selectCustomerQuery, { pageNumber: 2, pageSize: 10, status: 'active', searchTerm: 'smith' }],
    ['selectCustomerListStatus', selectors.selectCustomerListStatus, 'success'],
    ['selectCustomerListError', selectors.selectCustomerListError, 'list error'],
    ['selectSelectedCustomerId', selectors.selectSelectedCustomerId, 'C001'],
    ['selectSelectedCustomer', selectors.selectSelectedCustomer, customer],
    ['selectCustomerDetailStatus', selectors.selectCustomerDetailStatus, 'error'],
    ['selectCustomerDetailError', selectors.selectCustomerDetailError, 'detail error'],
    ['selectCustomerSaveStatus', selectors.selectCustomerSaveStatus, 'loading'],
    ['selectCustomerSaveError', selectors.selectCustomerSaveError, 'save error'],
    ['selectCustomerFieldErrors', selectors.selectCustomerFieldErrors, { email: 'Email already exists' }],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectCustomers(state)).toBe(selectors.selectCustomers(state))
      expect(selectors.selectCustomerQuery(state)).toBe(selectors.selectCustomerQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectCustomers(state)
      const next = { ...state, customers: { ...state.customers, listStatus: 'loading' as const } }
      expect(selectors.selectCustomers(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, customers: { ...state.customers, items: [customer] } }
      expect(selectors.selectCustomers(next)).toEqual([customer])
    })
  })
})
