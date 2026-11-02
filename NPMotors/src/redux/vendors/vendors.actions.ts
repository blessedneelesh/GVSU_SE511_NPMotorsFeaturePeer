import type { Vendor, VendorFormValues, VendorPage, VendorSaveError, VendorTypeFilter } from '../../types/vendors'
import { VENDOR_ACTIONS } from './vendors.constants'

export const loadVendors = () => ({ type: VENDOR_ACTIONS.LOAD })

export const loadVendorsSuccess = (page: VendorPage) => ({ type: VENDOR_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadVendorsFailure = (message: string) => ({ type: VENDOR_ACTIONS.LOAD_FAILURE, payload: message })

export const setVendorSearch = (searchTerm: string) => ({ type: VENDOR_ACTIONS.SET_SEARCH, payload: searchTerm })

export const setVendorTypeFilter = (type: VendorTypeFilter) => ({ type: VENDOR_ACTIONS.SET_TYPE_FILTER, payload: type })

export const setVendorPage = (pageNumber: number) => ({ type: VENDOR_ACTIONS.SET_PAGE, payload: pageNumber })

export const setVendorPageSize = (pageSize: number) => ({ type: VENDOR_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and fetches the vendor by id
export const selectVendor = (id: string) => ({ type: VENDOR_ACTIONS.SELECT, payload: id })

export const clearVendorSelection = () => ({ type: VENDOR_ACTIONS.CLEAR_SELECTION })

export const loadVendorByIdSuccess = (vendor: Vendor) => ({ type: VENDOR_ACTIONS.LOAD_BY_ID_SUCCESS, payload: vendor })

export const loadVendorByIdFailure = (message: string) => ({ type: VENDOR_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

export const createVendor = (values: VendorFormValues) => ({ type: VENDOR_ACTIONS.CREATE, payload: values })

export const createVendorSuccess = () => ({ type: VENDOR_ACTIONS.CREATE_SUCCESS })

export const createVendorFailure = (error: VendorSaveError) => ({ type: VENDOR_ACTIONS.CREATE_FAILURE, payload: error })

// Clears the save status and errors, e.g. when the form is opened or closed or the success banner is dismissed
export const resetVendorSave = () => ({ type: VENDOR_ACTIONS.RESET_SAVE })

export type VendorsAction =
  | ReturnType<typeof loadVendors>
  | ReturnType<typeof loadVendorsSuccess>
  | ReturnType<typeof loadVendorsFailure>
  | ReturnType<typeof setVendorSearch>
  | ReturnType<typeof setVendorTypeFilter>
  | ReturnType<typeof setVendorPage>
  | ReturnType<typeof setVendorPageSize>
  | ReturnType<typeof selectVendor>
  | ReturnType<typeof clearVendorSelection>
  | ReturnType<typeof loadVendorByIdSuccess>
  | ReturnType<typeof loadVendorByIdFailure>
  | ReturnType<typeof createVendor>
  | ReturnType<typeof createVendorSuccess>
  | ReturnType<typeof createVendorFailure>
  | ReturnType<typeof resetVendorSave>
