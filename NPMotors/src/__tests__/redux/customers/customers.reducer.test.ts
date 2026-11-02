import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/customers/customers.actions'
import customersReducer, { initialCustomersState, type CustomersState } from '../../../redux/customers/customers.reducer'
import { customer, customerPage, formValues, saveError } from '../../../test/fixtures/customers'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: CustomersState): CustomersState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.fieldErrors)
  return Object.freeze(state)
}

const initial = () => frozen({ ...initialCustomersState, query: { ...initialCustomersState.query }, items: [], fieldErrors: {} })

describe('customersReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(customersReducer(undefined, { type: '@@INIT' })).toEqual(initialCustomersState)
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(customersReducer(state, { type: 'other/action' })).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialCustomersState, listError: 'old error' })
      expect(customersReducer(state, actions.loadCustomers())).toEqual({ ...initialCustomersState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(customersReducer(initial(), actions.loadCustomersSuccess(customerPage))).toEqual({
        ...initialCustomersState,
        items: customerPage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(customersReducer(initial(), actions.loadCustomersFailure('Network error'))).toEqual({
        ...initialCustomersState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialCustomersState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialCustomersState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it('SET_SEARCH sets the term and resets to page 1', () => {
      expect(customersReducer(onPage3(), actions.setCustomerSearch('smith'))).toEqual({
        ...initialCustomersState,
        ...reloading,
        query: { ...initialCustomersState.query, searchTerm: 'smith', pageNumber: 1 },
      })
    })

    it('SET_STATUS_FILTER sets the status and resets to page 1', () => {
      expect(customersReducer(onPage3(), actions.setCustomerStatusFilter('active'))).toEqual({
        ...initialCustomersState,
        ...reloading,
        query: { ...initialCustomersState.query, status: 'active', pageNumber: 1 },
      })
    })

    it('SET_PAGE_SIZE sets the size and resets to page 1', () => {
      expect(customersReducer(onPage3(), actions.setCustomerPageSize(25))).toEqual({
        ...initialCustomersState,
        ...reloading,
        query: { ...initialCustomersState.query, pageSize: 25, pageNumber: 1 },
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(customersReducer(onPage3(), actions.setCustomerPage(4))).toEqual({
        ...initialCustomersState,
        ...reloading,
        query: { ...initialCustomersState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(customersReducer(onPage3(), actions.setCustomerPage(0)).query.pageNumber).toBe(1)
      expect(customersReducer(onPage3(), actions.setCustomerPage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('detail', () => {
    it('SELECT stores the id, clears the previous customer and starts loading', () => {
      const state = frozen({ ...initialCustomersState, selected: customer, detailStatus: 'error', detailError: 'old error' })
      expect(customersReducer(state, actions.selectCustomer('C002'))).toEqual({
        ...initialCustomersState,
        selectedId: 'C002',
        selected: null,
        detailStatus: 'loading',
        detailError: null,
      })
    })

    it('LOAD_BY_ID_SUCCESS stores the customer', () => {
      const state = frozen({ ...initialCustomersState, selectedId: 'C001', detailStatus: 'loading' })
      expect(customersReducer(state, actions.loadCustomerByIdSuccess(customer))).toEqual({
        ...initialCustomersState,
        selectedId: 'C001',
        selected: customer,
        detailStatus: 'success',
      })
    })

    it('LOAD_BY_ID_FAILURE stores the error', () => {
      const state = frozen({ ...initialCustomersState, selectedId: 'C001', detailStatus: 'loading' })
      expect(customersReducer(state, actions.loadCustomerByIdFailure('Not found'))).toEqual({
        ...initialCustomersState,
        selectedId: 'C001',
        detailStatus: 'error',
        detailError: 'Not found',
      })
    })

    it('CLEAR_SELECTION resets every detail field', () => {
      const state = frozen({ ...initialCustomersState, selectedId: 'C001', selected: customer, detailStatus: 'error', detailError: 'x' })
      expect(customersReducer(state, actions.clearCustomerSelection())).toEqual(initialCustomersState)
    })
  })

  describe('save', () => {
    it('CREATE starts saving and clears previous errors', () => {
      const state = frozen({ ...initialCustomersState, saveStatus: 'error', saveError: 'old', fieldErrors: { email: 'taken' } })
      expect(customersReducer(state, actions.createCustomer(formValues))).toEqual({
        ...initialCustomersState,
        saveStatus: 'loading',
        saveError: null,
        fieldErrors: {},
      })
    })

    it('CREATE_SUCCESS marks the save as successful', () => {
      const state = frozen({ ...initialCustomersState, saveStatus: 'loading' })
      expect(customersReducer(state, actions.createCustomerSuccess())).toEqual({ ...initialCustomersState, saveStatus: 'success' })
    })

    it('CREATE_FAILURE stores the message and field errors', () => {
      expect(customersReducer(initial(), actions.createCustomerFailure(saveError))).toEqual({
        ...initialCustomersState,
        saveStatus: 'error',
        saveError: saveError.message,
        fieldErrors: saveError.fieldErrors,
      })
    })

    it('CREATE_FAILURE stores null when the message is empty', () => {
      const result = customersReducer(initial(), actions.createCustomerFailure({ message: '', fieldErrors: { firstName: 'Required' } }))
      expect(result.saveError).toBeNull()
      expect(result.fieldErrors).toEqual({ firstName: 'Required' })
    })

    it('RESET_SAVE returns the save fields to idle', () => {
      const state = frozen({ ...initialCustomersState, saveStatus: 'error', saveError: 'x', fieldErrors: { email: 'taken' } })
      expect(customersReducer(state, actions.resetCustomerSave())).toEqual(initialCustomersState)
    })
  })
})
