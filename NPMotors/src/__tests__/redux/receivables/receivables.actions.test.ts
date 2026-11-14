import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/receivables/receivables.actions'
import { RECEIVABLE_ACTIONS } from '../../../redux/receivables/receivables.constants'
import { receivableCustomerOptions, receivablePage } from '../../../test/fixtures/receivables'

describe('receivables actions', () => {
  it.each([
    ['loadReceivables', actions.loadReceivables(), { type: RECEIVABLE_ACTIONS.LOAD }],
    ['loadReceivablesSuccess', actions.loadReceivablesSuccess(receivablePage), { type: RECEIVABLE_ACTIONS.LOAD_SUCCESS, payload: receivablePage }],
    ['loadReceivablesFailure', actions.loadReceivablesFailure('boom'), { type: RECEIVABLE_ACTIONS.LOAD_FAILURE, payload: 'boom' }],
    ['setReceivableStatusFilter', actions.setReceivableStatusFilter('overdue'), { type: RECEIVABLE_ACTIONS.SET_STATUS_FILTER, payload: 'overdue' }],
    ['setReceivableCustomerFilter', actions.setReceivableCustomerFilter('7'), { type: RECEIVABLE_ACTIONS.SET_CUSTOMER_FILTER, payload: '7' }],
    ['setReceivableAsOfDate', actions.setReceivableAsOfDate('2024-04-01'), { type: RECEIVABLE_ACTIONS.SET_AS_OF_DATE, payload: '2024-04-01' }],
    ['resetReceivableFilters', actions.resetReceivableFilters(), { type: RECEIVABLE_ACTIONS.RESET_FILTERS }],
    ['setReceivablePage', actions.setReceivablePage(3), { type: RECEIVABLE_ACTIONS.SET_PAGE, payload: 3 }],
    ['setReceivablePageSize', actions.setReceivablePageSize(25), { type: RECEIVABLE_ACTIONS.SET_PAGE_SIZE, payload: 25 }],
    ['loadReceivableCustomerOptions', actions.loadReceivableCustomerOptions(), { type: RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS }],
    ['loadReceivableCustomerOptionsSuccess', actions.loadReceivableCustomerOptionsSuccess(receivableCustomerOptions),
      { type: RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS_SUCCESS, payload: receivableCustomerOptions }],
    ['loadReceivableCustomerOptionsFailure', actions.loadReceivableCustomerOptionsFailure('nope'),
      { type: RECEIVABLE_ACTIONS.LOAD_CUSTOMER_OPTIONS_FAILURE, payload: 'nope' }],
  ])('%s', (_, action, expected) => {
    expect(action).toEqual(expected)
  })
})
