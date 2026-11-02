import { all, call, cancelled, put, select, takeLatest, takeLeading } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { vehiclesApi } from '../../services/vehicles/vehicles.api'
import {
  getVehicleDetailErrorMessage,
  getVehicleErrorMessage,
  getVehicleSaveError,
  VENDOR_OPTIONS_FALLBACK_MESSAGE,
} from '../../services/vehicles/vehicles.errors'
import type { Vehicle, VehiclePage, VehicleQuery, VehicleVendorOption } from '../../types/vehicles'
import {
  type clearVehicleSelection,
  type createVehicle,
  createVehicleFailure,
  createVehicleSuccess,
  loadVehicleByIdFailure,
  loadVehicleByIdSuccess,
  loadVehicles,
  loadVehiclesFailure,
  loadVehiclesSuccess,
  loadVehicleVendorOptionsFailure,
  loadVehicleVendorOptionsSuccess,
  type selectVehicle,
} from './vehicles.actions'
import { VEHICLE_ACTIONS } from './vehicles.constants'
import { selectVehicleQuery } from './vehicles.selectors'

function* loadVehiclesWorker(): SagaIterator {
  const query: VehicleQuery = yield select(selectVehicleQuery)
  const controller = new AbortController()
  try {
    const page: VehiclePage = yield call(vehiclesApi.getVehicles, query, controller.signal)
    yield put(loadVehiclesSuccess(page))
  } catch (error) {
    const message = getVehicleErrorMessage(error)
    if (message) yield put(loadVehiclesFailure(message))
  } finally {
    // takeLatest cancels superseded workers; abort their HTTP request too
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

type VehicleDetailAction = ReturnType<typeof selectVehicle> | ReturnType<typeof clearVehicleSelection>

function* loadVehicleByIdWorker(action: VehicleDetailAction): SagaIterator {
  // CLEAR_SELECTION only exists to make takeLatest cancel an in-flight lookup
  if (action.type !== VEHICLE_ACTIONS.SELECT) return
  const controller = new AbortController()
  try {
    const vehicle: Vehicle = yield call(vehiclesApi.getVehicleById, action.payload, controller.signal)
    yield put(loadVehicleByIdSuccess(vehicle))
  } catch (error) {
    const message = getVehicleDetailErrorMessage(error)
    if (message) yield put(loadVehicleByIdFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* loadVendorOptionsWorker(): SagaIterator {
  const controller = new AbortController()
  try {
    const options: VehicleVendorOption[] = yield call(vehiclesApi.getVendorOptions, controller.signal)
    yield put(loadVehicleVendorOptionsSuccess(options))
  } catch (error) {
    const message = getVehicleErrorMessage(error, VENDOR_OPTIONS_FALLBACK_MESSAGE)
    if (message) yield put(loadVehicleVendorOptionsFailure(message))
  } finally {
    const wasCancelled: boolean = yield cancelled()
    if (wasCancelled) controller.abort()
  }
}

function* createVehicleWorker(action: ReturnType<typeof createVehicle>): SagaIterator {
  try {
    yield call(vehiclesApi.addVehicle, action.payload)
    yield put(createVehicleSuccess())
    // Paging is server-side, so refetch the current page instead of inserting the row locally
    yield put(loadVehicles())
  } catch (error) {
    const saveError = getVehicleSaveError(error)
    if (saveError.message || Object.keys(saveError.fieldErrors).length) yield put(createVehicleFailure(saveError))
  }
}

export default function* vehiclesSaga(): SagaIterator {
  yield all([
    takeLatest(
      [
        VEHICLE_ACTIONS.LOAD,
        VEHICLE_ACTIONS.SET_STATUS_FILTER,
        VEHICLE_ACTIONS.SET_PAGE,
        VEHICLE_ACTIONS.SET_PAGE_SIZE,
        VEHICLE_ACTIONS.SET_SEARCH,
      ],
      loadVehiclesWorker,
    ),
    // Leaving the detail view cancels an in-flight lookup, so a late response can't fill a closed view
    takeLatest([VEHICLE_ACTIONS.SELECT, VEHICLE_ACTIONS.CLEAR_SELECTION], loadVehicleByIdWorker),
    // Reopening the form while vendors are still loading restarts the lookup instead of running two
    takeLatest(VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS, loadVendorOptionsWorker),
    // takeLeading ignores repeat submits while a save is in flight, so a double-click can't add the vehicle twice
    takeLeading(VEHICLE_ACTIONS.CREATE, createVehicleWorker),
  ])
}
