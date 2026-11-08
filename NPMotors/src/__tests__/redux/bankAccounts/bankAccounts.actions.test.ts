import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/bankAccounts/bankAccounts.actions'
import { BANK_ACCOUNT_ACTIONS } from '../../../redux/bankAccounts/bankAccounts.constants'
import { bankAccount, bankAccountPage, bankOptions, formValues, saveError } from '../../../test/fixtures/bankAccounts'

describe('bankAccounts actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadBankAccounts', actions.loadBankAccounts, BANK_ACCOUNT_ACTIONS.LOAD],
      ['clearBankAccountSelection', actions.clearBankAccountSelection, BANK_ACCOUNT_ACTIONS.CLEAR_SELECTION],
      ['loadBankOptions', actions.loadBankOptions, BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS],
      ['createBankAccountSuccess', actions.createBankAccountSuccess, BANK_ACCOUNT_ACTIONS.CREATE_SUCCESS],
      ['resetBankAccountSave', actions.resetBankAccountSave, BANK_ACCOUNT_ACTIONS.RESET_SAVE],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadBankAccountsSuccess carries the page', () => {
    expect(actions.loadBankAccountsSuccess(bankAccountPage)).toEqual({ type: BANK_ACCOUNT_ACTIONS.LOAD_SUCCESS, payload: bankAccountPage })
  })

  it('loadBankAccountsFailure carries the message', () => {
    expect(actions.loadBankAccountsFailure('Network error')).toEqual({ type: BANK_ACCOUNT_ACTIONS.LOAD_FAILURE, payload: 'Network error' })
  })

  it('setBankAccountSearch carries the search term', () => {
    expect(actions.setBankAccountSearch('chase')).toEqual({ type: BANK_ACCOUNT_ACTIONS.SET_SEARCH, payload: 'chase' })
  })

  it('setBankAccountBankFilter carries the bank id', () => {
    expect(actions.setBankAccountBankFilter('2')).toEqual({ type: BANK_ACCOUNT_ACTIONS.SET_BANK_FILTER, payload: '2' })
  })

  it('setBankAccountPage carries the page number', () => {
    expect(actions.setBankAccountPage(3)).toEqual({ type: BANK_ACCOUNT_ACTIONS.SET_PAGE, payload: 3 })
  })

  it('setBankAccountPageSize carries the page size', () => {
    expect(actions.setBankAccountPageSize(25)).toEqual({ type: BANK_ACCOUNT_ACTIONS.SET_PAGE_SIZE, payload: 25 })
  })

  it('selectBankAccount carries the id', () => {
    expect(actions.selectBankAccount('1')).toEqual({ type: BANK_ACCOUNT_ACTIONS.SELECT, payload: '1' })
  })

  it('loadBankAccountByIdSuccess carries the account', () => {
    expect(actions.loadBankAccountByIdSuccess(bankAccount)).toEqual({ type: BANK_ACCOUNT_ACTIONS.LOAD_BY_ID_SUCCESS, payload: bankAccount })
  })

  it('loadBankAccountByIdFailure carries the message', () => {
    expect(actions.loadBankAccountByIdFailure('Not found')).toEqual({ type: BANK_ACCOUNT_ACTIONS.LOAD_BY_ID_FAILURE, payload: 'Not found' })
  })

  it('loadBankOptionsSuccess carries the options', () => {
    expect(actions.loadBankOptionsSuccess(bankOptions)).toEqual({ type: BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS_SUCCESS, payload: bankOptions })
  })

  it('loadBankOptionsFailure carries the message', () => {
    expect(actions.loadBankOptionsFailure('Down')).toEqual({ type: BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS_FAILURE, payload: 'Down' })
  })

  it('createBankAccount carries the form values', () => {
    expect(actions.createBankAccount(formValues)).toEqual({ type: BANK_ACCOUNT_ACTIONS.CREATE, payload: formValues })
  })

  it('createBankAccountFailure carries the save error', () => {
    expect(actions.createBankAccountFailure(saveError)).toEqual({ type: BANK_ACCOUNT_ACTIONS.CREATE_FAILURE, payload: saveError })
  })
})
