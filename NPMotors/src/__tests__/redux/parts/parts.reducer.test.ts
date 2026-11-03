import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/parts/parts.actions'
import { loadCustomers } from '../../../redux/customers/customers.actions'
import { loadEmployees } from '../../../redux/employees/employees.actions'
import partsReducer, { initialPartsState, type PartsState } from '../../../redux/parts/parts.reducer'
import { loadVehicles } from '../../../redux/vehicles/vehicles.actions'
import { loadVendors } from '../../../redux/vendors/vendors.actions'
import {
  padsReceiveLine,
  part,
  partPage,
  partReceiveLines,
  partReceiveOptions,
  partVendorOptions,
  rotorsReceiveLine,
} from '../../../test/fixtures/parts'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: PartsState): PartsState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.vendorOptions)
  Object.freeze(state.receiveOptions)
  Object.freeze(state.receivedLines)
  return Object.freeze(state)
}

const initial = () => frozen({
  ...initialPartsState,
  query: { ...initialPartsState.query },
  items: [],
  vendorOptions: [],
  receiveOptions: { parts: [], bankAccounts: [] },
  receivedLines: [],
})

describe('partsReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(partsReducer(undefined, { type: '@@INIT' })).toEqual(initialPartsState)
  })

  it('starts on page 1 with 5 rows and no filters', () => {
    expect(initialPartsState.query).toEqual({ pageNumber: 1, pageSize: 5, category: 'all', stock: 'all', searchTerm: '' })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(partsReducer(state, { type: 'other/action' })).toBe(state)
  })

  it.each([
    ['customers', loadCustomers()],
    ['vendors', loadVendors()],
    ['employees', loadEmployees()],
    ['vehicles', loadVehicles()],
  ])('ignores %s actions', (_, action) => {
    const state = initial()
    expect(partsReducer(state, action)).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialPartsState, listError: 'old error' })
      expect(partsReducer(state, actions.loadParts())).toEqual({ ...initialPartsState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(partsReducer(initial(), actions.loadPartsSuccess(partPage))).toEqual({
        ...initialPartsState,
        items: partPage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(partsReducer(initial(), actions.loadPartsFailure('Network error'))).toEqual({
        ...initialPartsState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialPartsState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialPartsState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it('SET_SEARCH sets the term and resets to page 1', () => {
      expect(partsReducer(onPage3(), actions.setPartSearch('brake'))).toEqual({
        ...initialPartsState,
        ...reloading,
        query: { ...initialPartsState.query, searchTerm: 'brake', pageNumber: 1 },
      })
    })

    it('SET_CATEGORY_FILTER sets the category and resets to page 1', () => {
      expect(partsReducer(onPage3(), actions.setPartCategoryFilter('Brakes'))).toEqual({
        ...initialPartsState,
        ...reloading,
        query: { ...initialPartsState.query, category: 'Brakes', pageNumber: 1 },
      })
    })

    it('SET_STOCK_FILTER sets the stock filter and resets to page 1', () => {
      expect(partsReducer(onPage3(), actions.setPartStockFilter('low'))).toEqual({
        ...initialPartsState,
        ...reloading,
        query: { ...initialPartsState.query, stock: 'low', pageNumber: 1 },
      })
    })

    it('keeps the other filters when one changes', () => {
      const state = frozen({ ...initialPartsState, query: { ...initialPartsState.query, searchTerm: 'pad', category: 'Brakes' } })
      expect(partsReducer(state, actions.setPartStockFilter('low')).query)
        .toEqual({ ...initialPartsState.query, searchTerm: 'pad', category: 'Brakes', stock: 'low' })
    })

    it('SET_PAGE_SIZE sets the size and resets to page 1', () => {
      expect(partsReducer(onPage3(), actions.setPartPageSize(25))).toEqual({
        ...initialPartsState,
        ...reloading,
        query: { ...initialPartsState.query, pageSize: 25, pageNumber: 1 },
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(partsReducer(onPage3(), actions.setPartPage(4))).toEqual({
        ...initialPartsState,
        ...reloading,
        query: { ...initialPartsState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(partsReducer(onPage3(), actions.setPartPage(0)).query.pageNumber).toBe(1)
      expect(partsReducer(onPage3(), actions.setPartPage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('detail', () => {
    it('SELECT stores the id, clears the previous part and starts loading', () => {
      const state = frozen({ ...initialPartsState, selected: part, detailStatus: 'error', detailError: 'old error' })
      expect(partsReducer(state, actions.selectPart('7'))).toEqual({
        ...initialPartsState,
        selectedId: '7',
        selected: null,
        detailStatus: 'loading',
        detailError: null,
      })
    })

    it('LOAD_BY_ID_SUCCESS stores the part', () => {
      const state = frozen({ ...initialPartsState, selectedId: '1', detailStatus: 'loading' })
      expect(partsReducer(state, actions.loadPartByIdSuccess(part))).toEqual({
        ...initialPartsState,
        selectedId: '1',
        selected: part,
        detailStatus: 'success',
      })
    })

    it('LOAD_BY_ID_FAILURE stores the error', () => {
      const state = frozen({ ...initialPartsState, selectedId: '1', detailStatus: 'loading' })
      expect(partsReducer(state, actions.loadPartByIdFailure('Not found'))).toEqual({
        ...initialPartsState,
        selectedId: '1',
        detailStatus: 'error',
        detailError: 'Not found',
      })
    })

    it('CLEAR_SELECTION resets every detail field', () => {
      const state = frozen({ ...initialPartsState, selectedId: '1', selected: part, detailStatus: 'error', detailError: 'x' })
      expect(partsReducer(state, actions.clearPartSelection())).toEqual(initialPartsState)
    })
  })

  describe('vendor options', () => {
    it('LOAD_VENDOR_OPTIONS starts loading, clears the error and keeps the current options', () => {
      const state = frozen({ ...initialPartsState, vendorOptions: partVendorOptions, vendorOptionsStatus: 'error', vendorOptionsError: 'old' })
      expect(partsReducer(state, actions.loadPartVendorOptions())).toEqual({
        ...initialPartsState,
        vendorOptions: partVendorOptions,
        vendorOptionsStatus: 'loading',
        vendorOptionsError: null,
      })
    })

    it('LOAD_VENDOR_OPTIONS_SUCCESS stores the options', () => {
      expect(partsReducer(initial(), actions.loadPartVendorOptionsSuccess(partVendorOptions))).toEqual({
        ...initialPartsState,
        vendorOptions: partVendorOptions,
        vendorOptionsStatus: 'success',
      })
    })

    it('LOAD_VENDOR_OPTIONS_FAILURE stores the error', () => {
      expect(partsReducer(initial(), actions.loadPartVendorOptionsFailure('No vendors'))).toEqual({
        ...initialPartsState,
        vendorOptionsStatus: 'error',
        vendorOptionsError: 'No vendors',
      })
    })
  })

  describe('receive options', () => {
    it('LOAD_RECEIVE_OPTIONS starts loading, clears the error and keeps the current options', () => {
      const state = frozen({ ...initialPartsState, receiveOptions: partReceiveOptions, receiveOptionsStatus: 'error', receiveOptionsError: 'old' })
      expect(partsReducer(state, actions.loadPartReceiveOptions())).toEqual({
        ...initialPartsState,
        receiveOptions: partReceiveOptions,
        receiveOptionsStatus: 'loading',
        receiveOptionsError: null,
      })
    })

    it('LOAD_RECEIVE_OPTIONS_SUCCESS stores the parts and bank accounts', () => {
      expect(partsReducer(initial(), actions.loadPartReceiveOptionsSuccess(partReceiveOptions))).toEqual({
        ...initialPartsState,
        receiveOptions: partReceiveOptions,
        receiveOptionsStatus: 'success',
      })
    })

    it('LOAD_RECEIVE_OPTIONS_FAILURE stores the error', () => {
      expect(partsReducer(initial(), actions.loadPartReceiveOptionsFailure('No parts'))).toEqual({
        ...initialPartsState,
        receiveOptionsStatus: 'error',
        receiveOptionsError: 'No parts',
      })
    })

    it('leaves the list untouched', () => {
      const state = frozen({ ...initialPartsState, items: partPage.items, listStatus: 'success' })
      const result = partsReducer(state, actions.loadPartReceiveOptions())
      expect(result.items).toBe(state.items)
      expect(result.listStatus).toBe('success')
    })
  })

  describe('receive', () => {
    it('RECEIVE starts posting, clears the error and keeps the lines already received', () => {
      const state = frozen({ ...initialPartsState, saveStatus: 'error', saveError: 'old', receivedLines: [padsReceiveLine] })
      expect(partsReducer(state, actions.receiveParts([rotorsReceiveLine]))).toEqual({
        ...initialPartsState,
        saveStatus: 'loading',
        saveError: null,
        receivedLines: [padsReceiveLine],
      })
    })

    it('RECEIVE_SUCCESS marks the receipt as posted and stores the received lines', () => {
      const state = frozen({ ...initialPartsState, saveStatus: 'loading' })
      expect(partsReducer(state, actions.receivePartsSuccess(partReceiveLines))).toEqual({
        ...initialPartsState,
        saveStatus: 'success',
        receivedLines: partReceiveLines,
      })
    })

    // A retry after a partial failure only sends the remaining lines, so both rounds must add up
    it('RECEIVE_SUCCESS adds to the lines received before a failed attempt', () => {
      const state = frozen({ ...initialPartsState, saveStatus: 'loading', receivedLines: [padsReceiveLine] })
      expect(partsReducer(state, actions.receivePartsSuccess([rotorsReceiveLine])).receivedLines).toEqual(partReceiveLines)
    })

    it('RECEIVE_FAILURE stores the message and the lines saved before the failure', () => {
      const state = frozen({ ...initialPartsState, saveStatus: 'loading' })
      expect(partsReducer(state, actions.receivePartsFailure({ message: 'This part no longer exists.', received: [padsReceiveLine] }))).toEqual({
        ...initialPartsState,
        saveStatus: 'error',
        saveError: 'This part no longer exists.',
        receivedLines: [padsReceiveLine],
      })
    })

    it('RECEIVE_FAILURE stores null when the message is empty', () => {
      const result = partsReducer(initial(), actions.receivePartsFailure({ message: '', received: [] }))
      expect(result.saveStatus).toBe('error')
      expect(result.saveError).toBeNull()
    })

    it('RESET_SAVE returns the receipt fields to idle and forgets the received lines', () => {
      const state = frozen({ ...initialPartsState, saveStatus: 'success', saveError: 'x', receivedLines: partReceiveLines })
      expect(partsReducer(state, actions.resetPartSave())).toEqual(initialPartsState)
    })
  })
})
