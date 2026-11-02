import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { vendorsApi } from '../../services/vendors/vendors.api'
import { getVendorDetailErrorMessage, getVendorErrorMessage, getVendorSaveError } from '../../services/vendors/vendors.errors'
import type { Vendor, VendorPage, VendorQuery } from '../../types/vendors'
import {
  type clearVendorSelection,
  type createVendor,
  createVendorFailure,
  createVendorSuccess,
  loadVendorByIdFailure,
  loadVendorByIdSuccess,
  loadVendors,
  loadVendorsFailure,
  loadVendorsSuccess,
  type selectVendor,
} from './vendors.actions'
import { VENDOR_ACTIONS } from './vendors.constants'
import { selectVendorQuery } from './vendors.selectors'

function* loadVendorsWorker(): SagaIterator {
  const query: VendorQuery = yield select(selectVendorQuery)
  const controller = new AbortController()
  try {
    const page: VendorPage = yield call(vendorsApi.getVendors, query, controller.signal)
    yield put(loadVendorsSuccess(page))
  } catch (error) {
    const message = getVendorErrorMessage(error)
    if (message) yield put(loadVendorsFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type VendorDetailAction = ReturnType<typeof selectVendor> | ReturnType<typeof clearVendorSelection>

function* loadVendorByIdWorker(action: VendorDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== VENDOR_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const vendor: Vendor = yield call(vendorsApi.getVendorById, action.payload, controller.signal)
    yield put(loadVendorByIdSuccess(vendor))
  } catch (error) {
    const message = getVendorDetailErrorMessage(error)
    if (message) yield put(loadVendorByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* createVendorWorker(action: ReturnType<typeof createVendor>): SagaIterator {
  try {
    yield call(vendorsApi.addVendor, action.payload)
    yield put(createVendorSuccess())
    // Paging is server-side, so refetch the current page instead of inserting the row locally
    yield put(loadVendors())
  } catch (error) {
    const saveError = getVendorSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(createVendorFailure(saveError))
  }
}

export default function* vendorsSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        VENDOR_ACTIONS.LOAD,
        VENDOR_ACTIONS.SET_TYPE_FILTER,
        VENDOR_ACTIONS.SET_PAGE,
        VENDOR_ACTIONS.SET_PAGE_SIZE,
        VENDOR_ACTIONS.SET_SEARCH,
      ],
      loadVendorsWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([VENDOR_ACTIONS.SELECT, VENDOR_ACTIONS.CLEAR_SELECTION], loadVendorByIdWorker),
    // takeLeading ignores repeat submits while a save is in flight, so a double-click can't add the vendor twice
    takeLeading(VENDOR_ACTIONS.CREATE, createVendorWorker),
  ])
}
