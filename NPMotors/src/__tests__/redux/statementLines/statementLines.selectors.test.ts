import { describe, expect, it } from 'vitest'
import * as selectors from '../../../redux/statementLines/statementLines.selectors'
import { makeStatementLineState } from '../../../test/test-utils'
import { depositLine, statementAccountOptions, statementLinePage } from '../../../test/fixtures/statementLines'

const query = { pageNumber: 2, pageSize: 10, bankAccountId: '1', month: '2024-03', type: 'Transfer' } as const

// Every key differs from its initial value, so each selector is shown to read the right field
const state = makeStatementLineState({
  items: statementLinePage.items,
  hasNext: true,
  query,
  listStatus: 'success',
  listError: 'list error',
  accountOptions: statementAccountOptions,
  accountOptionsStatus: 'error',
  accountOptionsError: 'options error',
})

describe('statementLines selectors', () => {
  it('selectStatementLineState returns the slice', () => {
    expect(selectors.selectStatementLineState(state)).toBe(state.statementLines)
  })

  it.each([
    ['selectStatementLines', selectors.selectStatementLines, statementLinePage.items],
    ['selectStatementLineHasNext', selectors.selectStatementLineHasNext, true],
    ['selectStatementLineQuery', selectors.selectStatementLineQuery, query],
    ['selectStatementLineListStatus', selectors.selectStatementLineListStatus, 'success'],
    ['selectStatementLineListError', selectors.selectStatementLineListError, 'list error'],
    ['selectStatementLineAccountOptions', selectors.selectStatementLineAccountOptions, statementAccountOptions],
    ['selectStatementLineAccountOptionsStatus', selectors.selectStatementLineAccountOptionsStatus, 'error'],
    ['selectStatementLineAccountOptionsError', selectors.selectStatementLineAccountOptionsError, 'options error'],
  ] as const)('%s', (_, selector, expected) => {
    expect(selector(state)).toEqual(expected)
  })

  describe('memoization', () => {
    it('returns the same reference for the same state', () => {
      expect(selectors.selectStatementLines(state)).toBe(selectors.selectStatementLines(state))
      expect(selectors.selectStatementLineQuery(state)).toBe(selectors.selectStatementLineQuery(state))
    })

    it('keeps the items reference when another key in the slice changes', () => {
      const before = selectors.selectStatementLines(state)
      const next = { ...state, statementLines: { ...state.statementLines, listStatus: 'loading' as const } }
      expect(selectors.selectStatementLines(next)).toBe(before)
    })

    it('returns the new items when items change', () => {
      const next = { ...state, statementLines: { ...state.statementLines, items: [depositLine] } }
      expect(selectors.selectStatementLines(next)).toEqual([depositLine])
    })
  })
})
