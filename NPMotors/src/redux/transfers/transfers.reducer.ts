import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { TransferAccountOption, TransferFieldErrors } from '../../types/transfers'
import type { TransfersAction } from './transfers.actions'
import { TRANSFER_ACTIONS } from './transfers.constants'

export interface TransfersState {
  accountOptions: TransferAccountOption[]
  accountOptionsStatus: RequestStatus
  accountOptionsError: string | null
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: TransferFieldErrors
}

export const initialTransfersState: TransfersState = {
  accountOptions: [],
  accountOptionsStatus: 'idle',
  accountOptionsError: null,
  saveStatus: 'idle',
  saveError: null,
  fieldErrors: {},
}

const transferActionTypes: ReadonlySet<string> = new Set(Object.values(TRANSFER_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isTransfersAction = (action: UnknownAction): action is TransfersAction => transferActionTypes.has(action.type)

export default function transfersReducer(state: TransfersState = initialTransfersState, action: UnknownAction): TransfersState {
  if (!isTransfersAction(action)) return state

  switch (action.type) {
    case TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS:
      return { ...state, accountOptionsStatus: 'loading', accountOptionsError: null }
    case TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS:
      return { ...state, accountOptions: action.payload, accountOptionsStatus: 'success' }
    case TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE:
      return { ...state, accountOptionsStatus: 'error', accountOptionsError: action.payload }
    case TRANSFER_ACTIONS.CREATE:
      return { ...state, saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case TRANSFER_ACTIONS.CREATE_SUCCESS:
      return { ...state, saveStatus: 'success' }
    case TRANSFER_ACTIONS.CREATE_FAILURE:
      return { ...state, saveStatus: 'error', saveError: action.payload.message || null, fieldErrors: action.payload.fieldErrors }
    case TRANSFER_ACTIONS.RESET_SAVE:
      return { ...state, saveStatus: 'idle', saveError: null, fieldErrors: {} }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
