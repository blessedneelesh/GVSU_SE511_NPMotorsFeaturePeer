import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/parts/parts.actions'
import { PART_ACTIONS } from '../../../redux/parts/parts.constants'
import { part, partPage, partReceiveLines, partReceiveOptions, partVendorOptions } from '../../../test/fixtures/parts'

describe('parts actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadParts', actions.loadParts, PART_ACTIONS.LOAD],
      ['clearPartSelection', actions.clearPartSelection, PART_ACTIONS.CLEAR_SELECTION],
      ['loadPartVendorOptions', actions.loadPartVendorOptions, PART_ACTIONS.LOAD_VENDOR_OPTIONS],
      ['loadPartReceiveOptions', actions.loadPartReceiveOptions, PART_ACTIONS.LOAD_RECEIVE_OPTIONS],
      ['resetPartSave', actions.resetPartSave, PART_ACTIONS.RESET_SAVE],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadPartsSuccess carries the page', () => {
    expect(actions.loadPartsSuccess(partPage)).toEqual({ type: PART_ACTIONS.LOAD_SUCCESS, payload: partPage })
  })

  it('loadPartsFailure carries the message', () => {
    expect(actions.loadPartsFailure('Network error')).toEqual({ type: PART_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setPartSearch carries the search term', () => {
    expect(actions.setPartSearch('brake')).toEqual({ type: PART_ACTIONS.SET_SEARCH, payload: 'brake' })
  })

  it('setPartCategoryFilter carries the category', () => {
    expect(actions.setPartCategoryFilter('Brakes')).toEqual({ type: PART_ACTIONS.SET_CATEGORY_FILTER, payload: 'Brakes' })
  })

  it('setPartStockFilter carries the stock filter', () => {
    expect(actions.setPartStockFilter('low')).toEqual({ type: PART_ACTIONS.SET_STOCK_FILTER, payload: 'low' })
  })

  it('setPartPage carries the page number', () => {
    expect(actions.setPartPage(3)).toEqual({ type: PART_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setPartPageSize carries the page size', () => {
    expect(actions.setPartPageSize(25)).toEqual({ type: PART_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('selectPart carries the id', () => {
    expect(actions.selectPart('1')).toEqual({ type: PART_ACTIONS.SELECT, payload: '1' })
  })

  it('loadPartByIdSuccess carries the part', () => {
    expect(actions.loadPartByIdSuccess(part)).toEqual({ type: PART_ACTIONS.LOAD_BY_ID_SUCCESS, payload: part })
  })

  it('loadPartByIdFailure carries the message', () => {
    expect(actions.loadPartByIdFailure('Not found')).toEqual({ type: PART_ACTIONS.LOAD_BY_ID_FAILURE, payload: 'Not found' })
  })

  it('loadPartVendorOptionsSuccess carries the options', () => {
    expect(actions.loadPartVendorOptionsSuccess(partVendorOptions))
      .toEqual({ type: PART_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS, payload: partVendorOptions })
  })

  it('loadPartVendorOptionsFailure carries the message', () => {
    expect(actions.loadPartVendorOptionsFailure('No vendors'))
      .toEqual({ type: PART_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE, payload: 'No vendors' })
  })

  it('loadPartReceiveOptionsSuccess carries the parts and bank accounts', () => {
    expect(actions.loadPartReceiveOptionsSuccess(partReceiveOptions))
      .toEqual({ type: PART_ACTIONS.LOAD_RECEIVE_OPTIONS_SUCCESS, payload: partReceiveOptions })
  })

  it('loadPartReceiveOptionsFailure carries the message', () => {
    expect(actions.loadPartReceiveOptionsFailure('No parts'))
      .toEqual({ type: PART_ACTIONS.LOAD_RECEIVE_OPTIONS_FAILURE, payload: 'No parts' })
  })

  it('receiveParts carries the lines', () => {
    expect(actions.receiveParts(partReceiveLines)).toEqual({ type: PART_ACTIONS.RECEIVE, payload: partReceiveLines })
  })

  it('receivePartsSuccess carries the received lines', () => {
    expect(actions.receivePartsSuccess(partReceiveLines)).toEqual({ type: PART_ACTIONS.RECEIVE_SUCCESS, payload: partReceiveLines })
  })

  it('receivePartsFailure carries the message and the lines saved before the failure', () => {
    const failure = { message: 'This part no longer exists.', received: partReceiveLines.slice(0, 1) }
    expect(actions.receivePartsFailure(failure)).toEqual({ type: PART_ACTIONS.RECEIVE_FAILURE, payload: failure })
  })
})
