import type { TransferAccountOption, TransferFormValues, TransferSaveError } from '../../types/transfers'
import { TRANSFER_ACTIONS } from './transfers.constants'

// The From/To accounts and their balances
export const loadTransferAccountOptions = () => ({ type: TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS })

export const loadTransferAccountOptionsSuccess = (options: TransferAccountOption[]) => ({ type: TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS_SUCCESS, payload: options })

export const loadTransferAccountOptionsFailure = (message: string) => ({ type: TRANSFER_ACTIONS.LOAD_ACCOUNT_OPTIONS_FAILURE, payload: message })

export const createTransfer = (values: TransferFormValues) => ({ type: TRANSFER_ACTIONS.CREATE, payload: values })

export const createTransferSuccess = () => ({ type: TRANSFER_ACTIONS.CREATE_SUCCESS })

export const createTransferFailure = (error: TransferSaveError) => ({ type: TRANSFER_ACTIONS.CREATE_FAILURE, payload: error })

// Clears the save status and errors, e.g. when the page is opened or left or the success banner is dismissed
export const resetTransferSave = () => ({ type: TRANSFER_ACTIONS.RESET_SAVE })

export type TransfersAction =
  | ReturnType<typeof loadTransferAccountOptions>
  | ReturnType<typeof loadTransferAccountOptionsSuccess>
  | ReturnType<typeof loadTransferAccountOptionsFailure>
  | ReturnType<typeof createTransfer>
  | ReturnType<typeof createTransferSuccess>
  | ReturnType<typeof createTransferFailure>
  | ReturnType<typeof resetTransferSave>
