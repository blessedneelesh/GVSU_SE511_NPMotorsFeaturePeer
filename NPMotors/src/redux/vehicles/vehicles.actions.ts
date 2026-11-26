import type {
  Vehicle,
  VehicleBankAccountOption,
  VehiclePage,
  VehiclePurchaseFormValues,
  VehiclePurchaseResult,
  VehiclePurchaseSaveError,
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

// Fetches the vendors the Purchase Vehicle wizard offers
export const loadVehicleVendorOptions = () => ({ type: VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS })

export const loadVehicleVendorOptionsSuccess = (options: VehicleVendorOption[]) => ({ type: VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS, payload: options })

export const loadVehicleVendorOptionsFailure = (message: string) => ({ type: VEHICLE_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE, payload: message })

// Fetches the bank accounts the Purchase Vehicle payment step can pay from
export const loadVehicleBankAccountOptions = () => ({ type: VEHICLE_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS })

export const loadVehicleBankAccountOptionsSuccess = (options: VehicleBankAccountOption[]) => ({ type: VEHICLE_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_SUCCESS, payload: options })

export const loadVehicleBankAccountOptionsFailure = (message: string) => ({ type: VEHICLE_ACTIONS.LOAD_BANK_ACCOUNT_OPTIONS_FAILURE, payload: message })

// Posts the Purchase Vehicle wizard: adds the vehicle and records the payment and/or AP bill
export const purchaseVehicle = (values: VehiclePurchaseFormValues) => ({ type: VEHICLE_ACTIONS.PURCHASE, payload: values })

export const purchaseVehicleSuccess = (result: VehiclePurchaseResult) => ({ type: VEHICLE_ACTIONS.PURCHASE_SUCCESS, payload: result })

export const purchaseVehicleFailure = (error: VehiclePurchaseSaveError) => ({ type: VEHICLE_ACTIONS.PURCHASE_FAILURE, payload: error })

// Clears the purchase status, errors and result, e.g. when the wizard opens or the confirmation banner is dismissed
export const resetVehiclePurchase = () => ({ type: VEHICLE_ACTIONS.RESET_PURCHASE })

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
  | ReturnType<typeof loadVehicleBankAccountOptions>
  | ReturnType<typeof loadVehicleBankAccountOptionsSuccess>
  | ReturnType<typeof loadVehicleBankAccountOptionsFailure>
  | ReturnType<typeof purchaseVehicle>
  | ReturnType<typeof purchaseVehicleSuccess>
  | ReturnType<typeof purchaseVehicleFailure>
  | ReturnType<typeof resetVehiclePurchase>
