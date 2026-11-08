import { describe, expect, it } from 'vitest'
import * as actions from '../../../redux/transfers/transfers.actions'
import transfersReducer, { initialTransfersState, type TransfersState } from '../../../redux/transfers/transfers.reducer'
import { accountOptions, formValues, saveError } from '../../../test/fixtures/transfers'

// Freezes the state and its nested objects, so a reducer that mutates instead of copying throws
const frozen = (state: TransfersState): TransfersState => {
  Object.freeze(state.accountOptions)
  Object.freeze(state.fieldErrors)
  return Object.freeze(state)
}

const initial = () => frozen({ ...initialTransfersState, accountOptions: [], fieldErrors: {} })

describe('transfersReducer', () => {
  it('returns the initial state for an undefined state', () => {
    expect(transfersReducer(undefined, { type: '@@INIT' })).toEqual(initialTransfersState)
  })

  it('starts with no accounts and nothing saving', () => {
    expect(initialTransfersState).toEqual({
      accountOptions: [],
      accountOptionsStatus: 'idle',
      accountOptionsError: null,
      saveStatus: 'idle',
      saveError: null,
      fieldErrors: {},
    })
  })

  it('returns the same state reference for an unknown action', () => {
    const state = initial()
    expect(transfersReducer(state, { type: 'other/action' })).toBe(state)
  })

  it('ignores actions from other slices with similar names', () => {
    const state = initial()
    expect(transfersReducer(state, { type: 'bankAccounts/create' })).toBe(state)
  })

  describe('account options', () => {
    it('LOAD_ACCOUNT_OPTIONS starts loading, clears the error and keeps the previous options', () => {
      const state = frozen({ ...initialTransfersState, accountOptions, accountOptionsStatus: 'error', accountOptionsError: 'old' })
      expect(transfersReducer(state, actions.loadTransferAccountOptions())).toEqual({
        ...initialTransfersState,
        accountOptions,
        accountOptionsStatus: 'loading',
        accountOptionsError: null,
      })
    })

    it('LOAD_ACCOUNT_OPTIONS_SUCCESS stores the options', () => {
      expect(transfersReducer(initial(), actions.loadTransferAccountOptionsSuccess(accountOptions))).toEqual({
        ...initialTransfersState,
        accountOptions,
        accountOptionsStatus: 'success',
      })
    })

    it('LOAD_ACCOUNT_OPTIONS_FAILURE stores the error', () => {
      expect(transfersReducer(initial(), actions.loadTransferAccountOptionsFailure('Bank accounts could not be loaded.'))).toEqual({
        ...initialTransfersState,
        accountOptionsStatus: 'error',
        accountOptionsError: 'Bank accounts could not be loaded.',
      })
    })
  })

  describe('save', () => {
    it('CREATE starts saving and clears previous errors', () => {
      const state = frozen({ ...initialTransfersState, saveStatus: 'error', saveError: 'old', fieldErrors: { amount: 'Required' } })
      expect(transfersReducer(state, actions.createTransfer(formValues))).toEqual({
        ...initialTransfersState,
        saveStatus: 'loading',
        saveError: null,
        fieldErrors: {},
      })
    })

    it('CREATE_SUCCESS marks the save as successful', () => {
      const state = frozen({ ...initialTransfersState, saveStatus: 'loading' })
      expect(transfersReducer(state, actions.createTransferSuccess())).toEqual({ ...initialTransfersState, saveStatus: 'success' })
    })

    it('CREATE_SUCCESS keeps the loaded accounts', () => {
      const state = frozen({ ...initialTransfersState, accountOptions, accountOptionsStatus: 'success', saveStatus: 'loading' })
      expect(transfersReducer(state, actions.createTransferSuccess()).accountOptions).toBe(accountOptions)
    })

    it('CREATE_FAILURE stores the message and field errors', () => {
      expect(transfersReducer(initial(), actions.createTransferFailure(saveError))).toEqual({
        ...initialTransfersState,
        saveStatus: 'error',
        saveError: saveError.message,
        fieldErrors: saveError.fieldErrors,
      })
    })

    it('CREATE_FAILURE stores null when the message is empty', () => {
      const result = transfersReducer(initial(), actions.createTransferFailure({ message: '', fieldErrors: { amount: 'Required' } }))
      expect(result.saveError).toBeNull()
      expect(result.fieldErrors).toEqual({ amount: 'Required' })
    })

    it('RESET_SAVE returns the save fields to idle', () => {
      const state = frozen({ ...initialTransfersState, saveStatus: 'error', saveError: 'x', fieldErrors: { amount: 'Required' } })
      expect(transfersReducer(state, actions.resetTransferSave())).toEqual(initialTransfersState)
    })
  })
})
