import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/vendors/vendors.actions'
import { loadCustomers } from '../../../redux/customers/customers.actions'
import vendorsReducer, { initialVendorsState, type VendorsState } from '../../../redux/vendors/vendors.reducer'
import { vendor, vendorFormValues, vendorPage, vendorSaveError } from '../../../test/fixtures/vendors'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: VendorsState): VendorsState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.fieldErrors)
  return Object.freeze(state)
}

const initial = () => frozen({ ...initialVendorsState, query: { ...initialVendorsState.query }, items: [], fieldErrors: {} })

describe('vendorsReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(vendorsReducer(undefined, { type: '@@INIT' })).toEqual(initialVendorsState)
  })

  it('starts on page 1 with 5 rows and no type filter', () => {
    expect(initialVendorsState.query).toEqual({ pageNumber: 1, pageSize: 5, type: 'all', searchTerm: '' })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(vendorsReducer(state, { type: 'other/action' })).toBe(state)
  })

  it('ignores customers actions', () => {
    const state = initial()
    expect(vendorsReducer(state, loadCustomers())).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialVendorsState, listError: 'old error' })
      expect(vendorsReducer(state, actions.loadVendors())).toEqual({ ...initialVendorsState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(vendorsReducer(initial(), actions.loadVendorsSuccess(vendorPage))).toEqual({
        ...initialVendorsState,
        items: vendorPage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(vendorsReducer(initial(), actions.loadVendorsFailure('Network error'))).toEqual({
        ...initialVendorsState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialVendorsState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialVendorsState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it('SET_SEARCH sets the term and resets to page 1', () => {
      expect(vendorsReducer(onPage3(), actions.setVendorSearch('detroit'))).toEqual({
        ...initialVendorsState,
        ...reloading,
        query: { ...initialVendorsState.query, searchTerm: 'detroit', pageNumber: 1 },
      })
    })

    it('SET_TYPE_FILTER sets the type and resets to page 1', () => {
      expect(vendorsReducer(onPage3(), actions.setVendorTypeFilter('service'))).toEqual({
        ...initialVendorsState,
        ...reloading,
        query: { ...initialVendorsState.query, type: 'service', pageNumber: 1 },
      })
    })

    it('SET_PAGE_SIZE sets the size and resets to page 1', () => {
      expect(vendorsReducer(onPage3(), actions.setVendorPageSize(25))).toEqual({
        ...initialVendorsState,
        ...reloading,
        query: { ...initialVendorsState.query, pageSize: 25, pageNumber: 1 },
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(vendorsReducer(onPage3(), actions.setVendorPage(4))).toEqual({
        ...initialVendorsState,
        ...reloading,
        query: { ...initialVendorsState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(vendorsReducer(onPage3(), actions.setVendorPage(0)).query.pageNumber).toBe(1)
      expect(vendorsReducer(onPage3(), actions.setVendorPage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('detail', () => {
    it('SELECT stores the id, clears the previous vendor and starts loading', () => {
      const state = frozen({ ...initialVendorsState, selected: vendor, detailStatus: 'error', detailError: 'old error' })
      expect(vendorsReducer(state, actions.selectVendor('2'))).toEqual({
        ...initialVendorsState,
        selectedId: '2',
        selected: null,
        detailStatus: 'loading',
        detailError: null,
      })
    })

    it('LOAD_BY_ID_SUCCESS stores the vendor', () => {
      const state = frozen({ ...initialVendorsState, selectedId: '5', detailStatus: 'loading' })
      expect(vendorsReducer(state, actions.loadVendorByIdSuccess(vendor))).toEqual({
        ...initialVendorsState,
        selectedId: '5',
        selected: vendor,
        detailStatus: 'success',
      })
    })

    it('LOAD_BY_ID_FAILURE stores the error', () => {
      const state = frozen({ ...initialVendorsState, selectedId: '5', detailStatus: 'loading' })
      expect(vendorsReducer(state, actions.loadVendorByIdFailure('Not found'))).toEqual({
        ...initialVendorsState,
        selectedId: '5',
        detailStatus: 'error',
        detailError: 'Not found',
      })
    })

    it('CLEAR_SELECTION resets every detail field', () => {
      const state = frozen({ ...initialVendorsState, selectedId: '5', selected: vendor, detailStatus: 'error', detailError: 'x' })
      expect(vendorsReducer(state, actions.clearVendorSelection())).toEqual(initialVendorsState)
    })
  })

  describe('save', () => {
    it('CREATE starts saving and clears previous errors', () => {
      const state = frozen({ ...initialVendorsState, saveStatus: 'error', saveError: 'old', fieldErrors: { name: 'required' } })
      expect(vendorsReducer(state, actions.createVendor(vendorFormValues))).toEqual({
        ...initialVendorsState,
        saveStatus: 'loading',
        saveError: null,
        fieldErrors: {},
      })
    })

    it('CREATE_SUCCESS marks the save as successful', () => {
      const state = frozen({ ...initialVendorsState, saveStatus: 'loading' })
      expect(vendorsReducer(state, actions.createVendorSuccess())).toEqual({ ...initialVendorsState, saveStatus: 'success' })
    })

    it('CREATE_FAILURE stores the message and field errors', () => {
      expect(vendorsReducer(initial(), actions.createVendorFailure(vendorSaveError))).toEqual({
        ...initialVendorsState,
        saveStatus: 'error',
        saveError: vendorSaveError.message,
        fieldErrors: vendorSaveError.fieldErrors,
      })
    })

    it('CREATE_FAILURE stores null when the message is empty', () => {
      const result = vendorsReducer(initial(), actions.createVendorFailure({ message: '', fieldErrors: { type: 'Invalid type' } }))
      expect(result.saveError).toBeNull()
      expect(result.fieldErrors).toEqual({ type: 'Invalid type' })
    })

    it('RESET_SAVE returns the save fields to idle', () => {
      const state = frozen({ ...initialVendorsState, saveStatus: 'error', saveError: 'x', fieldErrors: { email: 'taken' } })
      expect(vendorsReducer(state, actions.resetVendorSave())).toEqual(initialVendorsState)
    })
  })
})
