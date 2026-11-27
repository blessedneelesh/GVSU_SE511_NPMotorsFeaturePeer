import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/receivables/receivables.actions'
import receivablesReducer, { initialReceivablesState, type ReceivablesState } from '../../../redux/receivables/receivables.reducer'
import { overdueReceivable, paidReceivableDetail, receivableCustomerOptions, receivableDetail, receivablePage } from '../../../test/fixtures/receivables'

// A page-3 state with every filter set, so each reducer case can be shown to reset or keep them
const filtered: ReceivablesState = {
  ...initialReceivablesState,
  items: [overdueReceivable],
  listStatus: 'success',
  listError: 'old error',
  query: { pageNumber: 3, pageSize: 10, status: 'overdue', customerId: '7', asOfDate: '2024-04-01' },
}

describe('receivablesReducer', () => {
  it('returns the initial state', () => {
    expect(receivablesReducer(undefined, { type: '@@INIT' })).toEqual(initialReceivablesState)
    expect(initialReceivablesState.query).toEqual({ pageNumber: 1, pageSize: 10, status: 'all', customerId: 'all', asOfDate: '' })
  })

  it('ignores actions from other slices', () => {
    expect(receivablesReducer(filtered, { type: 'customers/load' })).toBe(filtered)
  })

  it('LOAD sets loading and clears the error but keeps the rows', () => {
    const state = receivablesReducer(filtered, actions.loadReceivables())
    expect(state).toMatchObject({ listStatus: 'loading', listError: null, items: [overdueReceivable] })
  })

  it('LOAD_SUCCESS stores the page', () => {
    const state = receivablesReducer(filtered, actions.loadReceivablesSuccess(receivablePage))
    expect(state).toMatchObject({ items: receivablePage.items, hasNext: true, listStatus: 'success' })
  })

  it('LOAD_FAILURE stores the message', () => {
    const state = receivablesReducer(filtered, actions.loadReceivablesFailure('boom'))
    expect(state).toMatchObject({ listStatus: 'error', listError: 'boom' })
  })

  it.each([
    ['status', actions.setReceivableStatusFilter('partial'), { status: 'partial' }],
    ['customer', actions.setReceivableCustomerFilter('1'), { customerId: '1' }],
    ['as-of date', actions.setReceivableAsOfDate('2026-01-31'), { asOfDate: '2026-01-31' }],
    ['page size', actions.setReceivablePageSize(25), { pageSize: 25 }],
  ])('changing the %s returns to page 1 and starts loading', (_, action, change) => {
    const state = receivablesReducer(filtered, action)
    expect(state.query).toEqual({ ...filtered.query, ...change, pageNumber: 1 })
    expect(state).toMatchObject({ listStatus: 'loading', listError: null })
  })

  it('RESET_FILTERS clears every filter but keeps the page size', () => {
    const state = receivablesReducer(filtered, actions.resetReceivableFilters())
    expect(state.query).toEqual({ pageNumber: 1, pageSize: 10, status: 'all', customerId: 'all', asOfDate: '' })
    expect(state.listStatus).toBe('loading')
  })

  it('SET_PAGE keeps the filters and never goes below page 1', () => {
    expect(receivablesReducer(filtered, actions.setReceivablePage(4)).query).toEqual({ ...filtered.query, pageNumber: 4 })
    expect(receivablesReducer(filtered, actions.setReceivablePage(0)).query.pageNumber).toBe(1)
  })

  describe('detail', () => {
    it('SELECT stores the id, drops the previous record and starts loading', () => {
      const previous = { ...filtered, selectedId: '2', selected: paidReceivableDetail, detailStatus: 'error' as const, detailError: 'old' }
      const state = receivablesReducer(previous, actions.selectReceivable('2471'))
      expect(state).toMatchObject({ selectedId: '2471', selected: null, detailStatus: 'loading', detailError: null })
      expect(state.query).toBe(previous.query)
    })

    it('LOAD_BY_ID_SUCCESS stores the record', () => {
      const state = receivablesReducer({ ...filtered, selectedId: '2471', detailStatus: 'loading' }, actions.loadReceivableByIdSuccess(receivableDetail))
      expect(state).toMatchObject({ selected: receivableDetail, detailStatus: 'success' })
    })

    it('LOAD_BY_ID_FAILURE stores the message', () => {
      const state = receivablesReducer({ ...filtered, selectedId: '9', detailStatus: 'loading' }, actions.loadReceivableByIdFailure('This receivable no longer exists.'))
      expect(state).toMatchObject({ selectedId: '9', detailStatus: 'error', detailError: 'This receivable no longer exists.' })
    })

    it('CLEAR_SELECTION closes the detail and keeps the list query', () => {
      const open = { ...filtered, selectedId: '2471', selected: receivableDetail, detailStatus: 'success' as const }
      const state = receivablesReducer(open, actions.clearReceivableSelection())
      expect(state).toMatchObject({ selectedId: null, selected: null, detailStatus: 'idle', detailError: null })
      expect(state.query).toBe(filtered.query)
      expect(state.items).toBe(filtered.items)
    })
  })

  describe('customer options', () => {
    it('LOAD_CUSTOMER_OPTIONS sets loading and clears the error', () => {
      const state = receivablesReducer({ ...filtered, customerOptionsError: 'old' }, actions.loadReceivableCustomerOptions())
      expect(state).toMatchObject({ customerOptionsStatus: 'loading', customerOptionsError: null })
    })

    it('LOAD_CUSTOMER_OPTIONS_SUCCESS stores the options', () => {
      const state = receivablesReducer(filtered, actions.loadReceivableCustomerOptionsSuccess(receivableCustomerOptions))
      expect(state).toMatchObject({ customerOptions: receivableCustomerOptions, customerOptionsStatus: 'success' })
    })

    it('LOAD_CUSTOMER_OPTIONS_FAILURE stores the message and leaves the list alone', () => {
      const state = receivablesReducer(filtered, actions.loadReceivableCustomerOptionsFailure('nope'))
      expect(state).toMatchObject({ customerOptionsStatus: 'error', customerOptionsError: 'nope', listStatus: 'success' })
    })
  })
})
