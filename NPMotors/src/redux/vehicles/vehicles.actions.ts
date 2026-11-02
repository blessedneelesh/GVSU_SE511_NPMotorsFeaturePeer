import type {
  Vehicle,
  VehicleFormValues,
  VehiclePage,
  VehicleSaveError,
  VehicleStatusFilter,
  VehicleVendorOption,
} from '../../types/vehicles'
import { VEHICLE_ACTIONS } from './vehicles.constants'

export const loadVehicles = () => ({ type: VEHICLE_ACTIONS.LOAD })

export const loadVehiclesSuccess = (page: VehiclePage) => ({ type: VEHICLE_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadVehiclesFailure = (message: string) => ({ type: VEHICLE_ACTIONS.LOAD_FAILURE, payload: message })

export const setVehicleSearch = (searchTerm: string) => ({ type: VEHICLE_ACTIONS.SET_SEARCH, payload: searchTerm })

export const setVehicleStatusFilter = (status: VehicleStatusFilter) => ({ type: VEHICLE_ACTIONS.SET_STATUS_FILTER, payload: status })

export const setVehiclePage = (pageNumber: number) => ({ type: VEHICLE_ACTIONS.SET_PAGE, payload: pageNumber })

export const setVehiclePageSize = (pageSize: number) => ({ type: VEHICLE_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and fetches the vehicle by id
export const selectVehicle = (id: string) => ({ type: VEHICLE_ACTIONS.SELECT, payload: id })

export const clearVehicleSelection = () => ({ type: VEHICLE_ACTIONS.CLEAR_SELECTION })

export const loadVehicleByIdSuccess = (vehicle: Vehicle) => ({ type: VEHICLE_ACTIONS.LOAD_BY_ID_SUCCESS, payload: vehicle })

export const loadVehicleByIdFailure = (message: string) => ({ type: VEHICLE_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

// Fetches the vendors the Add Vehicle form offers
export const loadVehicleVendorOptions = () => ({ type: VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS })

export const loadVehicleVendorOptionsSuccess = (options: VehicleVendorOption[]) => ({ type: VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS, payload: options })

export const loadVehicleVendorOptionsFailure = (message: string) => ({ type: VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE, payload: message })

export const createVehicle = (values: VehicleFormValues) => ({ type: VEHICLE_ACTIONS.CREATE, payload: values })

export const createVehicleSuccess = () => ({ type: VEHICLE_ACTIONS.CREATE_SUCCESS })

export const createVehicleFailure = (error: VehicleSaveError) => ({ type: VEHICLE_ACTIONS.CREATE_FAILURE, payload: error })

// Clears the save status and errors, e.g. when the form is opened or closed or the success banner is dismissed
export const resetVehicleSave = () => ({ type: VEHICLE_ACTIONS.RESET_SAVE })

export type VehiclesAction =
  | ReturnType<typeof loadVehicles>
  | ReturnType<typeof loadVehiclesSuccess>
  | ReturnType<typeof loadVehiclesFailure>
  | ReturnType<typeof setVehicleSearch>
  | ReturnType<typeof setVehicleStatusFilter>
  | ReturnType<typeof setVehiclePage>
  | ReturnType<typeof setVehiclePageSize>
  | ReturnType<typeof selectVehicle>
  | ReturnType<typeof clearVehicleSelection>
  | ReturnType<typeof loadVehicleByIdSuccess>
  | ReturnType<typeof loadVehicleByIdFailure>
  | ReturnType<typeof loadVehicleVendorOptions>
  | ReturnType<typeof loadVehicleVendorOptionsSuccess>
  | ReturnType<typeof loadVehicleVendorOptionsFailure>
  | ReturnType<typeof createVehicle>
  | ReturnType<typeof createVehicleSuccess>
  | ReturnType<typeof createVehicleFailure>
  | ReturnType<typeof resetVehicleSave>
