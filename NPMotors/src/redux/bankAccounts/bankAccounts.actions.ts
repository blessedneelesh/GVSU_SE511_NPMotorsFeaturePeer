import type {
  BankAccount,
  BankAccountBankFilter,
  BankAccountFormValues,
  BankAccountPage,
  BankAccountSaveError,
  BankOption,
} from '../../types/bankAccounts'
import { BANK_ACCOUNT_ACTIONS } from './bankAccounts.constants'

export const loadBankAccounts = () => ({ type: BANK_ACCOUNT_ACTIONS.LOAD })

export const loadBankAccountsSuccess = (page: BankAccountPage) => ({ type: BANK_ACCOUNT_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadBankAccountsFailure = (message: string) => ({ type: BANK_ACCOUNT_ACTIONS.LOAD_FAILURE, payload: message })

export const setBankAccountSearch = (searchTerm: string) => ({ type: BANK_ACCOUNT_ACTIONS.SET_SEARCH, payload: searchTerm })

export const setBankAccountBankFilter = (bankId: BankAccountBankFilter) => ({ type: BANK_ACCOUNT_ACTIONS.SET_BANK_FILTER, payload: bankId })

export const setBankAccountPage = (pageNumber: number) => ({ type: BANK_ACCOUNT_ACTIONS.SET_PAGE, payload: pageNumber })

export const setBankAccountPageSize = (pageSize: number) => ({ type: BANK_ACCOUNT_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and fetches the account by id
export const selectBankAccount = (id: string) => ({ type: BANK_ACCOUNT_ACTIONS.SELECT, payload: id })

export const clearBankAccountSelection = () => ({ type: BANK_ACCOUNT_ACTIONS.CLEAR_SELECTION })

export const loadBankAccountByIdSuccess = (account: BankAccount) => ({ type: BANK_ACCOUNT_ACTIONS.LOAD_BY_ID_SUCCESS, payload: account })

export const loadBankAccountByIdFailure = (message: string) => ({ type: BANK_ACCOUNT_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

// The banks offered by the bank filter and the Add Bank Account form
export const loadBankOptions = () => ({ type: BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS })

export const loadBankOptionsSuccess = (options: BankOption[]) => ({ type: BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS_SUCCESS, payload: options })

export const loadBankOptionsFailure = (message: string) => ({ type: BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS_FAILURE, payload: message })

export const createBankAccount = (values: BankAccountFormValues) => ({ type: BANK_ACCOUNT_ACTIONS.CREATE, payload: values })

export const createBankAccountSuccess = () => ({ type: BANK_ACCOUNT_ACTIONS.CREATE_SUCCESS })

export const createBankAccountFailure = (error: BankAccountSaveError) => ({ type: BANK_ACCOUNT_ACTIONS.CREATE_FAILURE, payload: error })

// Clears the save status and errors, e.g. when the form is opened or closed or the success banner is dismissed
export const resetBankAccountSave = () => ({ type: BANK_ACCOUNT_ACTIONS.RESET_SAVE })

export type BankAccountsAction =
  | ReturnType<typeof loadBankAccounts>
  | ReturnType<typeof loadBankAccountsSuccess>
  | ReturnType<typeof loadBankAccountsFailure>
  | ReturnType<typeof setBankAccountSearch>
  | ReturnType<typeof setBankAccountBankFilter>
  | ReturnType<typeof setBankAccountPage>
  | ReturnType<typeof setBankAccountPageSize>
  | ReturnType<typeof selectBankAccount>
  | ReturnType<typeof clearBankAccountSelection>
  | ReturnType<typeof loadBankAccountByIdSuccess>
  | ReturnType<typeof loadBankAccountByIdFailure>
  | ReturnType<typeof loadBankOptions>
  | ReturnType<typeof loadBankOptionsSuccess>
  | ReturnType<typeof loadBankOptionsFailure>
  | ReturnType<typeof createBankAccount>
  | ReturnType<typeof createBankAccountSuccess>
  | ReturnType<typeof createBankAccountFailure>
  | ReturnType<typeof resetBankAccountSave>
