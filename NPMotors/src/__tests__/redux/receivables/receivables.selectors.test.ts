import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/receivables/receivables.selectors'
import { makeReceivableState } from '../../../test/test-utils'
import { receivableCustomerOptions, receivablePage } from '../../../test/fixtures/receivables'

const query = { pageNumber: 2, pageSize: 10, status: 'overdue', customerId: '7', asOfDate: '2024-04-01' } as const

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeReceivableState({
  items: receivablePage.items,
  hasNext: true,
  query,
  listStatus: 'success',
  listError: 'list error',
  customerOptions: receivableCustomerOptions,
  customerOptionsStatus: 'error',
  customerOptionsError: 'options error',
})

describe('receivables selectors', () => {
  it('selectReceivableState returns the slice', () => {
    expect(selectors.selectReceivableState(state)).toBe(state.receivables)
  })

  it.each([
    ['selectReceivables', selectors.selectReceivables, receivablePage.items],
    ['selectReceivableHasNext', selectors.selectReceivableHasNext, true],
    ['selectReceivableQuery', selectors.selectReceivableQuery, query],
    ['selectReceivableListStatus', selectors.selectReceivableListStatus, 'success'],
    ['selectReceivableListError', selectors.selectReceivableListError, 'list error'],
    ['selectReceivableCustomerOptions', selectors.selectReceivableCustomerOptions, receivableCustomerOptions],
    ['selectReceivableCustomerOptionsStatus', selectors.selectReceivableCustomerOptionsStatus, 'error'],
    ['selectReceivableCustomerOptionsError', selectors.selectReceivableCustomerOptionsError, 'options error'],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  it('returns the same reference for the same state', () => {
    expect(selectors.selectReceivables(state)).toBe(selectors.selectReceivables(state))
  })
})
