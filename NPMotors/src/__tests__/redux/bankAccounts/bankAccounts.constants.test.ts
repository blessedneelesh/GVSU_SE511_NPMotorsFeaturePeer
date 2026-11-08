import { describe, expect, it } from 'vitest'
import { BANK_ACCOUNT_ACTIONS } from '../../../redux/bankAccounts/bankAccounts.constants'

describe('BANK_ACCOUNT_ACTIONS', () => {
  it.each([
    ['LOAD', 'bankAccounts/load'],
    ['LOAD_SUCCESS', 'bankAccounts/loadSuccess'],
    ['LOAD_FAILURE', 'bankAccounts/loadFailure'],
    ['SET_SEARCH', 'bankAccounts/setSearch'],
    ['SET_BANK_FILTER', 'bankAccounts/setBankFilter'],
    ['SET_PAGE', 'bankAccounts/setPage'],
    ['SET_PAGE_SIZE', 'bankAccounts/setPageSize'],
    ['SELECT', 'bankAccounts/select'],
    ['CLEAR_SELECTION', 'bankAccounts/clearSelection'],
    ['LOAD_BY_ID_SUCCESS', 'bankAccounts/loadByIdSuccess'],
    ['LOAD_BY_ID_FAILURE', 'bankAccounts/loadByIdFailure'],
    ['LOAD_BANK_OPTIONS', 'bankAccounts/loadBankOptions'],
    ['LOAD_BANK_OPTIONS_SUCCESS', 'bankAccounts/loadBankOptionsSuccess'],
    ['LOAD_BANK_OPTIONS_FAILURE', 'bankAccounts/loadBankOptionsFailure'],
    ['CREATE', 'bankAccounts/create'],
    ['CREATE_SUCCESS', 'bankAccounts/createSuccess'],
    ['CREATE_FAILURE', 'bankAccounts/createFailure'],
    ['RESET_SAVE', 'bankAccounts/resetSave'],
  ] as const)('%s equals %s', (key, value) => {
    expect(BANK_ACCOUNT_ACTIONS[key]).toBe(value)
  })

  it('has 18 action types', () => {
    expect(Object.keys(BANK_ACCOUNT_ACTIONS)).toHaveLength(18)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(BANK_ACCOUNT_ACTIONS)).size).toBe(Object.keys(BANK_ACCOUNT_ACTIONS).length)
  })

  it('prefixes every value with bankAccounts/', () => {
    for (const value of Object.values(BANK_ACCOUNT_ACTIONS)) expect(value).toMatch(/^bankAccounts\//)
  })
})
