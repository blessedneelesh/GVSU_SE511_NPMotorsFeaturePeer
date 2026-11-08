import { describe, expect, it } from 'vitest'
import { TRANSFER_ACTIONS } from '../../../redux/transfers/transfers.constants'

describe('TRANSFER_ACTIONS', () => {
  it.each([
    ['LOAD_ACCOUNT_OPTIONS', 'transfers/loadAccountOptions'],
    ['LOAD_ACCOUNT_OPTIONS_SUCCESS', 'transfers/loadAccountOptionsSuccess'],
    ['LOAD_ACCOUNT_OPTIONS_FAILURE', 'transfers/loadAccountOptionsFailure'],
    ['CREATE', 'transfers/create'],
    ['CREATE_SUCCESS', 'transfers/createSuccess'],
    ['CREATE_FAILURE', 'transfers/createFailure'],
    ['RESET_SAVE', 'transfers/resetSave'],
  ] as const)('%s equals %s', (key, value) => {
    expect(TRANSFER_ACTIONS[key]).toBe(value)
  })

  it('has 7 action types', () => {
    expect(Object.keys(TRANSFER_ACTIONS)).toHaveLength(7)
  })

  it('has unique values', () => {
    expect(new Set(Object.values(TRANSFER_ACTIONS)).size).toBe(Object.keys(TRANSFER_ACTIONS).length)
  })

  it('prefixes every value with transfers/', () => {
    for (const value of Object.values(TRANSFER_ACTIONS)) expect(value).toMatch(/^transfers\//)
  })
})
