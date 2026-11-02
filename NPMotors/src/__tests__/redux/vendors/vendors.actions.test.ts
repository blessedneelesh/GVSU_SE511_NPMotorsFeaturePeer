import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/vendors/vendors.actions'
import { VENDOR_ACTIONS } from '../../../redux/vendors/vendors.constants'
import { vendor, vendorFormValues, vendorPage, vendorSaveError } from '../../../test/fixtures/vendors'

describe('vendors actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadVendors', actions.loadVendors, VENDOR_ACTIONS.LOAD],
      ['clearVendorSelection', actions.clearVendorSelection, VENDOR_ACTIONS.CLEAR_SELECTION],
      ['createVendorSuccess', actions.createVendorSuccess, VENDOR_ACTIONS.CREATE_SUCCESS],
      ['resetVendorSave', actions.resetVendorSave, VENDOR_ACTIONS.RESET_SAVE],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadVendorsSuccess carries the page', () => {
    expect(actions.loadVendorsSuccess(vendorPage)).toEqual({ type: VENDOR_ACTIONS.LOAD_SUCCESS, payload: vendorPage })
  })

  it('loadVendorsFailure carries the message', () => {
    expect(actions.loadVendorsFailure('Network error')).toEqual({ type: VENDOR_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setVendorSearch carries the search term', () => {
    expect(actions.setVendorSearch('detroit')).toEqual({ type: VENDOR_ACTIONS.SET_SEARCH, payload: 'detroit' })
  })

  it('setVendorTypeFilter carries the type', () => {
    expect(actions.setVendorTypeFilter('parts')).toEqual({ type: VENDOR_ACTIONS.SET_TYPE_FILTER, payload: 'parts' })
  })

  it('setVendorPage carries the page number', () => {
    expect(actions.setVendorPage(3)).toEqual({ type: VENDOR_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setVendorPageSize carries the page size', () => {
    expect(actions.setVendorPageSize(25)).toEqual({ type: VENDOR_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('selectVendor carries the id', () => {
    expect(actions.selectVendor('5')).toEqual({ type: VENDOR_ACTIONS.SELECT, payload: '5' })
  })

  it('loadVendorByIdSuccess carries the vendor', () => {
    expect(actions.loadVendorByIdSuccess(vendor)).toEqual({ type: VENDOR_ACTIONS.LOAD_BY_ID_SUCCESS, payload: vendor })
  })

  it('loadVendorByIdFailure carries the message', () => {
    expect(actions.loadVendorByIdFailure('Not found')).toEqual({ type: VENDOR_ACTIONS.LOAD_BY_ID_FAILURE, payload: 'Not found' })
  })

  it('createVendor carries the form values', () => {
    expect(actions.createVendor(vendorFormValues)).toEqual({ type: VENDOR_ACTIONS.CREATE, payload: vendorFormValues })
  })

  it('createVendorFailure carries the save error', () => {
    expect(actions.createVendorFailure(vendorSaveError)).toEqual({ type: VENDOR_ACTIONS.CREATE_FAILURE, payload: vendorSaveError })
  })
})
