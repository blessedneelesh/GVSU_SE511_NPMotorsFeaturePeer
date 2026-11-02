import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectVehicleState = (state: RootState) => state.vehicles

export const selectVehicles = createSelector([selectVehicleState], (vehicles) => vehicles.items)

export const selectVehicleHasNext = createSelector([selectVehicleState], (vehicles) => vehicles.hasNext)

export const selectVehicleQuery = createSelector([selectVehicleState], (vehicles) => vehicles.query)

export const selectVehicleListStatus = createSelector([selectVehicleState], (vehicles) => vehicles.listStatus)

export const selectVehicleListError = createSelector([selectVehicleState], (vehicles) => vehicles.listError)

export const selectSelectedVehicleId = createSelector([selectVehicleState], (vehicles) => vehicles.selectedId)

export const selectSelectedVehicle = createSelector([selectVehicleState], (vehicles) => vehicles.selected)

export const selectVehicleDetailStatus = createSelector([selectVehicleState], (vehicles) => vehicles.detailStatus)

export const selectVehicleDetailError = createSelector([selectVehicleState], (vehicles) => vehicles.detailError)

export const selectVehicleVendorOptions = createSelector([selectVehicleState], (vehicles) => vehicles.vendorOptions)

export const selectVehicleVendorOptionsStatus = createSelector([selectVehicleState], (vehicles) => vehicles.vendorOptionsStatus)

export const selectVehicleVendorOptionsError = createSelector([selectVehicleState], (vehicles) => vehicles.vendorOptionsError)

export const selectVehicleSaveStatus = createSelector([selectVehicleState], (vehicles) => vehicles.saveStatus)

export const selectVehicleSaveError = createSelector([selectVehicleState], (vehicles) => vehicles.saveError)

export const selectVehicleFieldErrors = createSelector([selectVehicleState], (vehicles) => vehicles.fieldErrors)
