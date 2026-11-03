import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { partsApi } from '../../services/parts/parts.api'
import {
  getPartDetailErrorMessage,
  getPartErrorMessage,
  getPartReceiveErrorMessage,
  RECEIVE_OPTIONS_FALLBACK_MESSAGE,
  VENDOR_OPTIONS_FALLBACK_MESSAGE,
} from '../../services/parts/parts.errors'
import type { Part, PartPage, PartQuery, PartReceiveLine, PartReceiveOptions, PartVendorOption } from '../../types/parts'
import {
  type clearPartSelection,
  loadPartByIdFailure,
  loadPartByIdSuccess,
  loadPartReceiveOptionsFailure,
  loadPartReceiveOptionsSuccess,
  loadParts,
  loadPartsFailure,
  loadPartsSuccess,
  loadPartVendorOptionsFailure,
  loadPartVendorOptionsSuccess,
  type receiveParts,
  receivePartsFailure,
  receivePartsSuccess,
  type selectPart,
} from './parts.actions'
import { PART_ACTIONS } from './parts.constants'
import { selectPartQuery } from './parts.selectors'

function* loadPartsWorker(): SagaIterator {
  const query: PartQuery = yield select(selectPartQuery)
  const controller = new AbortController()
  try {
    const page: PartPage = yield call(partsApi.getParts, query, controller.signal)
    yield put(loadPartsSuccess(page))
  } catch (error) {
    const message = getPartErrorMessage(error)
    if (message) yield put(loadPartsFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type PartDetailAction = ReturnType<typeof selectPart> | ReturnType<typeof clearPartSelection>

function* loadPartByIdWorker(action: PartDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== PART_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const part: Part = yield call(partsApi.getPartById, action.payload, controller.signal)
    yield put(loadPartByIdSuccess(part))
  } catch (error) {
    const message = getPartDetailErrorMessage(error)
    if (message) yield put(loadPartByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadVendorOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: PartVendorOption[] = yield call(partsApi.getVendorOptions, controller.signal)
    yield put(loadPartVendorOptionsSuccess(options))
  } catch (error) {
    const message = getPartErrorMessage(error, VENDOR_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadPartVendorOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadReceiveOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: PartReceiveOptions = yield call(partsApi.getReceiveOptions, controller.signal)
    yield put(loadPartReceiveOptionsSuccess(options))
  } catch (error) {
    const message = getPartErrorMessage(error, RECEIVE_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadPartReceiveOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

// UpdatePart takes one part per request, so the lines go one after another. On a failure the remaining lines
// are not sent, and the failure reports the lines already saved so the form never sends them again.
function* receivePartsWorker(action: ReturnType<typeof receiveParts>): SagaIterator {
  const received: PartReceiveLine[] = []
  try {
    for (const line of action.payload) {
      yield call(partsApi.receivePart, line.partId, line.quantity)
      received.push(line)
    }
    yield put(receivePartsSuccess(received))
  } catch (error) {
    yield put(receivePartsFailure({ message: getPartReceiveErrorMessage(error), received }))
  }
  // Paging is server-side, so refetch the current page instead of patching quantities locally
  if (received.length) yield put(loadParts())
}

export default function* partsSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        PART_ACTIONS.LOAD,
        PART_ACTIONS.SET_CATEGORY_FILTER,
        PART_ACTIONS.SET_STOCK_FILTER,
        PART_ACTIONS.SET_PAGE,
        PART_ACTIONS.SET_PAGE_SIZE,
        PART_ACTIONS.SET_SEARCH,
      ],
      loadPartsWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([PART_ACTIONS.SELECT, PART_ACTIONS.CLEAR_SELECTION], loadPartByIdWorker),
    // Reopening the form while a lookup is in flight restarts it instead of running two
    takeLatest(PART_ACTIONS.LOAD_VENDOR_OPTIONS, loadVendorOptionsWorker),
    takeLatest(PART_ACTIONS.LOAD_RECEIVE_OPTIONS, loadReceiveOptionsWorker),
    // takeLeading ignores repeat submits while a receipt is posting, so a double-click can't add the stock twice
    takeLeading(PART_ACTIONS.RECEIVE, receivePartsWorker),
  ])
}
