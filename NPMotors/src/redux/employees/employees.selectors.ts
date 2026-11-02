import { createSelector } from 'reselect'
import type { RootState } from '../rootReducer'

export const selectEmployeeState = (state: RootState) => state.employees

export const selectEmployees = createSelector([selectEmployeeState], (employees) => employees.items)

export const selectEmployeeHasNext = createSelector([selectEmployeeState], (employees) => employees.hasNext)

export const selectEmployeeQuery = createSelector([selectEmployeeState], (employees) => employees.query)

export const selectEmployeeListStatus = createSelector([selectEmployeeState], (employees) => employees.listStatus)

export const selectEmployeeListError = createSelector([selectEmployeeState], (employees) => employees.listError)

export const selectSelectedEmployeeId = createSelector([selectEmployeeState], (employees) => employees.selectedId)

export const selectSelectedEmployee = createSelector([selectEmployeeState], (employees) => employees.selected)

export const selectEmployeeDetailStatus = createSelector([selectEmployeeState], (employees) => employees.detailStatus)

export const selectEmployeeDetailError = createSelector([selectEmployeeState], (employees) => employees.detailError)

export const selectEmployeeSaveStatus = createSelector([selectEmployeeState], (employees) => employees.saveStatus)

export const selectEmployeeSaveError = createSelector([selectEmployeeState], (employees) => employees.saveError)

export const selectEmployeeFieldErrors = createSelector([selectEmployeeState], (employees) => employees.fieldErrors)
