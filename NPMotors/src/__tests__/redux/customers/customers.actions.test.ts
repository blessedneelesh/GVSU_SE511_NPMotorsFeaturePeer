import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/customers/customers.actions'
import { CUSTOMER_ACTIONS } from '../../../redux/customers/customers.constants'
import { customer, customerPage, formValues, saveError } from '../../../test/fixtures/customers'

describe('customers actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadCustomers', actions.loadCustomers, CUSTOMER_ACTIONS.LOAD],
      ['clearCustomerSelection', actions.clearCustomerSelection, CUSTOMER_ACTIONS.CLEAR_SELECTION],
      ['createCustomerSuccess', actions.createCustomerSuccess, CUSTOMER_ACTIONS.CREATE_SUCCESS],
      ['resetCustomerSave', actions.resetCustomerSave, CUSTOMER_ACTIONS.RESET_SAVE],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadCustomersSuccess carries the page', () => {
    expect(actions.loadCustomersSuccess(customerPage)).toEqual({ type: CUSTOMER_ACTIONS.LOAD_SUCCESS, payload: customerPage })
  })

  it('loadCustomersFailure carries the message', () => {
    expect(actions.loadCustomersFailure('Network error')).toEqual({ type: CUSTOMER_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setCustomerSearch carries the search term', () => {
    expect(actions.setCustomerSearch('smith')).toEqual({ type: CUSTOMER_ACTIONS.SET_SEARCH, payload: 'smith' })
  })

  it('setCustomerStatusFilter carries the status', () => {
    expect(actions.setCustomerStatusFilter('inactive')).toEqual({ type: CUSTOMER_ACTIONS.SET_STATUS_FILTER, payload: 'inactive' })
  })

  it('setCustomerPage carries the page number', () => {
    expect(actions.setCustomerPage(3)).toEqual({ type: CUSTOMER_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setCustomerPageSize carries the page size', () => {
    expect(actions.setCustomerPageSize(25)).toEqual({ type: CUSTOMER_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('selectCustomer carries the id', () => {
    expect(actions.selectCustomer('C001')).toEqual({ type: CUSTOMER_ACTIONS.SELECT, payload: 'C001' })
  })

  it('loadCustomerByIdSuccess carries the customer', () => {
    expect(actions.loadCustomerByIdSuccess(customer)).toEqual({ type: CUSTOMER_ACTIONS.LOAD_BY_ID_SUCCESS, payload: customer })
  })

  it('loadCustomerByIdFailure carries the message', () => {
    expect(actions.loadCustomerByIdFailure('Not found')).toEqual({ type: CUSTOMER_ACTIONS.LOAD_BY_ID_FAILURE, payload: 'Not found' })
  })

  it('createCustomer carries the form values', () => {
    expect(actions.createCustomer(formValues)).toEqual({ type: CUSTOMER_ACTIONS.CREATE, payload: formValues })
  })

  it('createCustomerFailure carries the save error', () => {
    expect(actions.createCustomerFailure(saveError)).toEqual({ type: CUSTOMER_ACTIONS.CREATE_FAILURE, payload: saveError })
  })
})
