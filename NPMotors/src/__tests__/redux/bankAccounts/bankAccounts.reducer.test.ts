import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/bankAccounts/bankAccounts.actions'
import bankAccountsReducer, { initialBankAccountsState, type BankAccountsState } from '../../../redux/bankAccounts/bankAccounts.reducer'
import { bankAccount, bankAccountPage, bankOptions, formValues, saveError } from '../../../test/fixtures/bankAccounts'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: BankAccountsState): BankAccountsState => {
  Object.freeze(state.query)
  Object.freeze(state.items)
  Object.freeze(state.bankOptions)
  Object.freeze(state.fieldErrors)
  return Object.freeze(state)
}

const initial = () => frozen({
  ...initialBankAccountsState,
  query: { ...initialBankAccountsState.query },
  items: [],
  bankOptions: [],
  fieldErrors: {},
})

describe('bankAccountsReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(bankAccountsReducer(undefined, { type: '@@INIT' })).toEqual(initialBankAccountsState)
  })

  it('starts on page 1 of 5 with every bank', () => {
    expect(initialBankAccountsState.query).toEqual({ pageNumber: 1, pageSize: 5, bankId: 'all', searchTerm: '' })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(bankAccountsReducer(state, { type: 'other/action' })).toBe(state)
  })

  describe('list', () => {
    it('LOAD sets loading and clears the list error', () => {
      const state = frozen({ ...initialBankAccountsState, listError: 'old error' })
      expect(bankAccountsReducer(state, actions.loadBankAccounts())).toEqual({ ...initialBankAccountsState, listStatus: 'loading', listError: null })
    })

    it('LOAD_SUCCESS stores the items and hasNext', () => {
      expect(bankAccountsReducer(initial(), actions.loadBankAccountsSuccess(bankAccountPage))).toEqual({
        ...initialBankAccountsState,
        items: bankAccountPage.items,
        hasNext: true,
        listStatus: 'success',
      })
    })

    it('LOAD_FAILURE stores the error', () => {
      expect(bankAccountsReducer(initial(), actions.loadBankAccountsFailure('Network error'))).toEqual({
        ...initialBankAccountsState,
        listStatus: 'error',
        listError: 'Network error',
      })
    })
  })

  describe('query setters', () => {
    // Start on page 3 with an error, so each case shows whether it resets the page and clears the error
    const onPage3 = () => frozen({
      ...initialBankAccountsState,
      listStatus: 'error',
      listError: 'old error',
      query: { ...initialBankAccountsState.query, pageNumber: 3 },
    })
    const reloading = { listStatus: 'loading' as const, listError: null }

    it('SET_SEARCH sets the term and resets to page 1', () => {
      expect(bankAccountsReducer(onPage3(), actions.setBankAccountSearch('chase'))).toEqual({
        ...initialBankAccountsState,
        ...reloading,
        query: { ...initialBankAccountsState.query, searchTerm: 'chase', pageNumber: 1 },
      })
    })

    it('SET_BANK_FILTER sets the bank and resets to page 1', () => {
      expect(bankAccountsReducer(onPage3(), actions.setBankAccountBankFilter('2'))).toEqual({
        ...initialBankAccountsState,
        ...reloading,
        query: { ...initialBankAccountsState.query, bankId: '2', pageNumber: 1 },
      })
    })

    it('SET_PAGE_SIZE sets the size and resets to page 1', () => {
      expect(bankAccountsReducer(onPage3(), actions.setBankAccountPageSize(25))).toEqual({
        ...initialBankAccountsState,
        ...reloading,
        query: { ...initialBankAccountsState.query, pageSize: 25, pageNumber: 1 },
      })
    })

    it('SET_PAGE sets the page number', () => {
      expect(bankAccountsReducer(onPage3(), actions.setBankAccountPage(4))).toEqual({
        ...initialBankAccountsState,
        ...reloading,
        query: { ...initialBankAccountsState.query, pageNumber: 4 },
      })
    })

    it('SET_PAGE clamps the page number to at least 1', () => {
      expect(bankAccountsReducer(onPage3(), actions.setBankAccountPage(0)).query.pageNumber).toBe(1)
      expect(bankAccountsReducer(onPage3(), actions.setBankAccountPage(-2)).query.pageNumber).toBe(1)
    })
  })

  describe('detail', () => {
    it('SELECT stores the id, clears the previous account and starts loading', () => {
      const state = frozen({ ...initialBankAccountsState, selected: bankAccount, detailStatus: 'error', detailError: 'old error' })
      expect(bankAccountsReducer(state, actions.selectBankAccount('2'))).toEqual({
        ...initialBankAccountsState,
        selectedId: '2',
        selected: null,
        detailStatus: 'loading',
        detailError: null,
      })
    })

    it('LOAD_BY_ID_SUCCESS stores the account', () => {
      const state = frozen({ ...initialBankAccountsState, selectedId: '1', detailStatus: 'loading' })
      expect(bankAccountsReducer(state, actions.loadBankAccountByIdSuccess(bankAccount))).toEqual({
        ...initialBankAccountsState,
        selectedId: '1',
        selected: bankAccount,
        detailStatus: 'success',
      })
    })

    it('LOAD_BY_ID_FAILURE stores the error', () => {
      const state = frozen({ ...initialBankAccountsState, selectedId: '1', detailStatus: 'loading' })
      expect(bankAccountsReducer(state, actions.loadBankAccountByIdFailure('Not found'))).toEqual({
        ...initialBankAccountsState,
        selectedId: '1',
        detailStatus: 'error',
        detailError: 'Not found',
      })
    })

    it('CLEAR_SELECTION resets every detail field', () => {
      const state = frozen({ ...initialBankAccountsState, selectedId: '1', selected: bankAccount, detailStatus: 'error', detailError: 'x' })
      expect(bankAccountsReducer(state, actions.clearBankAccountSelection())).toEqual(initialBankAccountsState)
    })
  })

  describe('bank options', () => {
    it('LOAD_BANK_OPTIONS starts loading, clears the error and keeps the previous options', () => {
      const state = frozen({ ...initialBankAccountsState, bankOptions, bankOptionsStatus: 'error', bankOptionsError: 'old' })
      expect(bankAccountsReducer(state, actions.loadBankOptions())).toEqual({
        ...initialBankAccountsState,
        bankOptions,
        bankOptionsStatus: 'loading',
        bankOptionsError: null,
      })
    })

    it('LOAD_BANK_OPTIONS_SUCCESS stores the options', () => {
      expect(bankAccountsReducer(initial(), actions.loadBankOptionsSuccess(bankOptions))).toEqual({
        ...initialBankAccountsState,
        bankOptions,
        bankOptionsStatus: 'success',
      })
    })

    it('LOAD_BANK_OPTIONS_FAILURE stores the error', () => {
      expect(bankAccountsReducer(initial(), actions.loadBankOptionsFailure('Banks could not be loaded.'))).toEqual({
        ...initialBankAccountsState,
        bankOptionsStatus: 'error',
        bankOptionsError: 'Banks could not be loaded.',
      })
    })
  })

  describe('save', () => {
    it('CREATE starts saving and clears previous errors', () => {
      const state = frozen({ ...initialBankAccountsState, saveStatus: 'error', saveError: 'old', fieldErrors: { name: 'Required' } })
      expect(bankAccountsReducer(state, actions.createBankAccount(formValues))).toEqual({
        ...initialBankAccountsState,
        saveStatus: 'loading',
        saveError: null,
        fieldErrors: {},
      })
    })

    it('CREATE_SUCCESS marks the save as successful', () => {
      const state = frozen({ ...initialBankAccountsState, saveStatus: 'loading' })
      expect(bankAccountsReducer(state, actions.createBankAccountSuccess())).toEqual({ ...initialBankAccountsState, saveStatus: 'success' })
    })

    it('CREATE_FAILURE stores the message and field errors', () => {
      expect(bankAccountsReducer(initial(), actions.createBankAccountFailure(saveError))).toEqual({
        ...initialBankAccountsState,
        saveStatus: 'error',
        saveError: saveError.message,
        fieldErrors: saveError.fieldErrors,
      })
    })

    it('CREATE_FAILURE stores null when the message is empty', () => {
      const result = bankAccountsReducer(initial(), actions.createBankAccountFailure({ message: '', fieldErrors: { name: 'Required' } }))
      expect(result.saveError).toBeNull()
      expect(result.fieldErrors).toEqual({ name: 'Required' })
    })

    it('RESET_SAVE returns the save fields to idle', () => {
      const state = frozen({ ...initialBankAccountsState, saveStatus: 'error', saveError: 'x', fieldErrors: { name: 'Required' } })
      expect(bankAccountsReducer(state, actions.resetBankAccountSave())).toEqual(initialBankAccountsState)
    })
  })
})
