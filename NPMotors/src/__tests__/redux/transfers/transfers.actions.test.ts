import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/transfers/transfers.actions'
import { TRANSFER_ACTIONS } from '../../../redux/transfers/transfers.constants'
import { accountOptions, formValues, saveError } from '../../../test/fixtures/transfers'

describe('transfers actions', () => {
  describe('creators without a payload', () => {
    it.each([
      ['loadTransferAccountOptions', actions.loadTransferAccountOptions, TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS],
      ['createTransferSuccess', actions.createTransferSuccess, TRANSFER_ACTIONS.CREATE_SUCCESS],
      ['resetTransferSave', actions.resetTransferSave, TRANSFER_ACTIONS.RESET_SAVE],
    ] as const)('%s creates { type } with no payload key', (_, creator, type) => {
      const action = creator()
      expect(action).toEqual({ type })
      expect(action).not.toHaveProperty('payload')
    })
  })

  it('loadTransferAccountOptionsSuccess carries the options', () => {
    expect(actions.loadTransferAccountOptionsSuccess(accountOptions)).toEqual({ type: TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS, payload: accountOptions })
  })

  it('loadTransferAccountOptionsFailure carries the message', () => {
    expect(actions.loadTransferAccountOptionsFailure('Network error')).toEqual({ type: TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE, payload: 'Network error' })
  })

  it('createTransfer carries the form values', () => {
    expect(actions.createTransfer(formValues)).toEqual({ type: TRANSFER_ACTIONS.CREATE, payload: formValues })
  })

  it('createTransferFailure carries the message and field errors', () => {
    expect(actions.createTransferFailure(saveError)).toEqual({ type: TRANSFER_ACTIONS.CREATE_FAILURE, payload: saveError })
  })
})
