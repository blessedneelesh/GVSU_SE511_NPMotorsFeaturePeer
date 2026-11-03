import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/parts/parts.selectors'
import { makePartState } from '../../../test/test-utils'
import { part, partPage, partReceiveLines, partReceiveOptions, partVendorOptions } from '../../../test/fixtures/parts'

const query = { pageNumber: 2, pageSize: 10, category: 'Brakes', stock: 'low', searchTerm: 'pad' } as const

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makePartState({
  items: partPage.items,
  hasNext: true,
  query,
  listStatus: 'success',
  listError: 'list error',
  selectedId: '1',
  selected: part,
  detailStatus: 'error',
  detailError: 'detail error',
  vendorOptions: partVendorOptions,
  vendorOptionsStatus: 'success',
  vendorOptionsError: 'vendor error',
  receiveOptions: partReceiveOptions,
  receiveOptionsStatus: 'error',
  receiveOptionsError: 'options error',
  saveStatus: 'loading',
  saveError: 'save error',
  receivedLines: partReceiveLines,
})

describe('parts selectors', () => {
  it('selectPartState returns the slice', () => {
    expect(selectors.selectPartState(state)).toBe(state.parts)
  })

  it.each([
    ['selectParts', selectors.selectParts, partPage.items],
    ['selectPartHasNext', selectors.selectPartHasNext, true],
    ['selectPartQuery', selectors.selectPartQuery, query],
    ['selectPartListStatus', selectors.selectPartListStatus, 'success'],
    ['selectPartListError', selectors.selectPartListError, 'list error'],
    ['selectSelectedPartId', selectors.selectSelectedPartId, '1'],
    ['selectSelectedPart', selectors.selectSelectedPart, part],
    ['selectPartDetailStatus', selectors.selectPartDetailStatus, 'error'],
    ['selectPartDetailError', selectors.selectPartDetailError, 'detail error'],
    ['selectPartVendorOptions', selectors.selectPartVendorOptions, partVendorOptions],
    ['selectPartVendorOptionsStatus', selectors.selectPartVendorOptionsStatus, 'success'],
    ['selectPartVendorOptionsError', selectors.selectPartVendorOptionsError, 'vendor error'],
    ['selectPartReceiveOptions', selectors.selectPartReceiveOptions, partReceiveOptions],
    ['selectPartReceiveOptionsStatus', selectors.selectPartReceiveOptionsStatus, 'error'],
    ['selectPartReceiveOptionsError', selectors.selectPartReceiveOptionsError, 'options error'],
    ['selectPartSaveStatus', selectors.selectPartSaveStatus, 'loading'],
    ['selectPartSaveError', selectors.selectPartSaveError, 'save error'],
    ['selectPartReceivedLines', selectors.selectPartReceivedLines, partReceiveLines],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectParts(state)).toBe(selectors.selectParts(state))
      expect(selectors.selectPartQuery(state)).toBe(selectors.selectPartQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectParts(state)
      const next = { ...state, parts: { ...state.parts, listStatus: 'loading' as const } }
      expect(selectors.selectParts(next)).toBe(before)
    })

    it('keeps the items reference when only another slice changes', () => {
      const before = selectors.selectParts(state)
      const next = { ...state, vehicles: { ...state.vehicles, listStatus: 'loading' as const } }
      expect(selectors.selectParts(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, parts: { ...state.parts, items: [part] } }
      expect(selectors.selectParts(next)).toEqual([part])
    })
  })
})
