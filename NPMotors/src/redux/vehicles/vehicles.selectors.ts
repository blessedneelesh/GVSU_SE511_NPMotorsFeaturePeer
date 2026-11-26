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

export const selectVehicleBankAccountOptions = createSelector([selectVehicleState], (vehicles) => vehicles.bankAccountOptions)

export const selectVehicleBankAccountOptionsStatus = createSelector([selectVehicleState], (vehicles) => vehicles.bankAccountOptionsStatus)

export const selectVehicleBankAccountOptionsError = createSelector([selectVehicleState], (vehicles) => vehicles.bankAccountOptionsError)

export const selectVehiclePurchaseStatus = createSelector([selectVehicleState], (vehicles) => vehicles.purchaseStatus)

export const selectVehiclePurchaseError = createSelector([selectVehicleState], (vehicles) => vehicles.purchaseError)

export const selectVehiclePurchaseFieldErrors = createSelector([selectVehicleState], (vehicles) => vehicles.purchaseFieldErrors)

export const selectVehiclePurchaseResult = createSelector([selectVehicleState], (vehicles) => vehicles.purchaseResult)
