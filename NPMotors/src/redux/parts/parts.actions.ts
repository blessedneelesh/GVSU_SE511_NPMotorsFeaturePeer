import type {
  Part,
  PartCategoryFilter,
  PartPage,
  PartReceiveFailure,
  PartReceiveLine,
  PartReceiveOptions,
  PartStockFilter,
  PartVendorOption,
} from '../../types/parts'
import { PART_ACTIONS } from './parts.constants'

export const loadParts = () => ({ type: PART_ACTIONS.LOAD })

export const loadPartsSuccess = (page: PartPage) => ({ type: PART_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadPartsFailure = (message: string) => ({ type: PART_ACTIONS.LOAD_FAILURE, payload: message })

export const setPartSearch = (searchTerm: string) => ({ type: PART_ACTIONS.SET_SEARCH, payload: searchTerm })

export const setPartCategoryFilter = (category: PartCategoryFilter) => ({ type: PART_ACTIONS.SET_CATEGORY_FILTER, payload: category })

export const setPartStockFilter = (stock: PartStockFilter) => ({ type: PART_ACTIONS.SET_STOCK_FILTER, payload: stock })

export const setPartPage = (pageNumber: number) => ({ type: PART_ACTIONS.SET_PAGE, payload: pageNumber })

export const setPartPageSize = (pageSize: number) => ({ type: PART_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and fetches the part by id
export const selectPart = (id: string) => ({ type: PART_ACTIONS.SELECT, payload: id })

export const clearPartSelection = () => ({ type: PART_ACTIONS.CLEAR_SELECTION })

export const loadPartByIdSuccess = (part: Part) => ({ type: PART_ACTIONS.LOAD_BY_ID_SUCCESS, payload: part })

export const loadPartByIdFailure = (message: string) => ({ type: PART_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

// Fetches the vendors used for the Vendor column and the Receive Parts form
export const loadPartVendorOptions = () => ({ type: PART_ACTIONS.LOAD_VENDOR_OPTIONS })

export const loadPartVendorOptionsSuccess = (options: PartVendorOption[]) => ({ type: PART_ACTIONS.LOAD_VENDOR_OPTIONS_SUCCESS, payload: options })

export const loadPartVendorOptionsFailure = (message: string) => ({ type: PART_ACTIONS.LOAD_VENDOR_OPTIONS_FAILURE, payload: message })

// Fetches every part and bank account for the Receive Parts form
export const loadPartReceiveOptions = () => ({ type: PART_ACTIONS.LOAD_RECEIVE_OPTIONS })

export const loadPartReceiveOptionsSuccess = (options: PartReceiveOptions) => ({ type: PART_ACTIONS.LOAD_RECEIVE_OPTIONS_SUCCESS, payload: options })

export const loadPartReceiveOptionsFailure = (message: string) => ({ type: PART_ACTIONS.LOAD_RECEIVE_OPTIONS_FAILURE, payload: message })

export const receiveParts = (lines: PartReceiveLine[]) => ({ type: PART_ACTIONS.RECEIVE, payload: lines })

export const receivePartsSuccess = (received: PartReceiveLine[]) => ({ type: PART_ACTIONS.RECEIVE_SUCCESS, payload: received })

export const receivePartsFailure = (failure: PartReceiveFailure) => ({ type: PART_ACTIONS.RECEIVE_FAILURE, payload: failure })

// Clears the receipt status, error and received lines, e.g. when the form is opened or closed
export const resetPartSave = () => ({ type: PART_ACTIONS.RESET_SAVE })

export type PartsAction =
  | ReturnType<typeof loadParts>
  | ReturnType<typeof loadPartsSuccess>
  | ReturnType<typeof loadPartsFailure>
  | ReturnType<typeof setPartSearch>
  | ReturnType<typeof setPartCategoryFilter>
  | ReturnType<typeof setPartStockFilter>
  | ReturnType<typeof setPartPage>
  | ReturnType<typeof setPartPageSize>
  | ReturnType<typeof selectPart>
  | ReturnType<typeof clearPartSelection>
  | ReturnType<typeof loadPartByIdSuccess>
  | ReturnType<typeof loadPartByIdFailure>
  | ReturnType<typeof loadPartVendorOptions>
  | ReturnType<typeof loadPartVendorOptionsSuccess>
  | ReturnType<typeof loadPartVendorOptionsFailure>
  | ReturnType<typeof loadPartReceiveOptions>
  | ReturnType<typeof loadPartReceiveOptionsSuccess>
  | ReturnType<typeof loadPartReceiveOptionsFailure>
  | ReturnType<typeof receiveParts>
  | ReturnType<typeof receivePartsSuccess>
  | ReturnType<typeof receivePartsFailure>
  | ReturnType<typeof resetPartSave>
