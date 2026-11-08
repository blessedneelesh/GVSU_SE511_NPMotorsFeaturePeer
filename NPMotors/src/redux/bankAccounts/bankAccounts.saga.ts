import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { bankAccountsApi } from '../../services/bankAccounts/bankAccounts.api'
import {
  BANK_OPTIONS_FALLBACK_MESSAGE,
  getBankAccountDetailErrorMessage,
  getBankAccountErrorMessage,
  getBankAccountSaveError,
} from '../../services/bankAccounts/bankAccounts.errors'
import type { BankAccount, BankAccountPage, BankAccountQuery, BankOption } from '../../types/bankAccounts'
import {
  type clearBankAccountSelection,
  type createBankAccount,
  createBankAccountFailure,
  createBankAccountSuccess,
  loadBankAccountByIdFailure,
  loadBankAccountByIdSuccess,
  loadBankAccounts,
  loadBankAccountsFailure,
  loadBankAccountsSuccess,
  loadBankOptionsFailure,
  loadBankOptionsSuccess,
  type selectBankAccount,
} from './bankAccounts.actions'
import { BANK_ACCOUNT_ACTIONS } from './bankAccounts.constants'
import { selectBankAccountQuery } from './bankAccounts.selectors'

function* loadBankAccountsWorker(): SagaIterator {
  const query: BankAccountQuery = yield select(selectBankAccountQuery)
  const controller = new AbortController()
  try {
    const page: BankAccountPage = yield call(bankAccountsApi.getBankAccounts, query, controller.signal)
    yield put(loadBankAccountsSuccess(page))
  } catch (error) {
    const message = getBankAccountErrorMessage(error)
    if (message) yield put(loadBankAccountsFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type BankAccountDetailAction = ReturnType<typeof selectBankAccount> | ReturnType<typeof clearBankAccountSelection>

function* loadBankAccountByIdWorker(action: BankAccountDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== BANK_ACCOUNT_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const account: BankAccount = yield call(bankAccountsApi.getBankAccountById, action.payload, controller.signal)
    yield put(loadBankAccountByIdSuccess(account))
  } catch (error) {
    const message = getBankAccountDetailErrorMessage(error)
    if (message) yield put(loadBankAccountByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadBankOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: BankOption[] = yield call(bankAccountsApi.getBankOptions, controller.signal)
    yield put(loadBankOptionsSuccess(options))
  } catch (error) {
    const message = getBankAccountErrorMessage(error, BANK_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadBankOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* createBankAccountWorker(action: ReturnType<typeof createBankAccount>): SagaIterator {
  try {
    yield call(bankAccountsApi.addBankAccount, action.payload)
    yield put(createBankAccountSuccess())
    // Paging is server-side, so refetch the current page instead of inserting the row locally
    yield put(loadBankAccounts())
  } catch (error) {
    const saveError = getBankAccountSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(createBankAccountFailure(saveError))
  }
}

export default function* bankAccountsSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        BANK_ACCOUNT_ACTIONS.LOAD,
        BANK_ACCOUNT_ACTIONS.SET_BANK_FILTER,
        BANK_ACCOUNT_ACTIONS.SET_PAGE,
        BANK_ACCOUNT_ACTIONS.SET_PAGE_SIZE,
        BANK_ACCOUNT_ACTIONS.SET_SEARCH,
      ],
      loadBankAccountsWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([BANK_ACCOUNT_ACTIONS.SELECT, BANK_ACCOUNT_ACTIONS.CLEAR_SELECTION], loadBankAccountByIdWorker),
    takeLatest(BANK_ACCOUNT_ACTIONS.LOAD_BANK_OPTIONS, loadBankOptionsWorker),
    // takeLeading ignores repeat submits while a save is in flight, so a double-click can't add the account twice
    takeLeading(BANK_ACCOUNT_ACTIONS.CREATE, createBankAccountWorker),
  ])
}
