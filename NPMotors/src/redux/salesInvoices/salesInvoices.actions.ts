import type {
  CustomerSalesInvoices,
  SalesInvoice,
  SalesInvoiceCancelRequest,
  SalesInvoiceDraftRequest,
  SalesInvoiceFormValues,
  SalesInvoiceOptions,
  SalesInvoicePage,
  SalesInvoiceSaveError,
  SalesInvoiceStatusFilter,
} from '../../types/salesInvoices'
import type { Vehicle } from '../../types/vehicles'
import { SALES_INVOICE_ACTIONS } from './salesInvoices.constants'

export const loadSalesInvoices = () => ({ type: SALES_INVOICE_ACTIONS.LOAD })

export const loadSalesInvoicesSuccess = (page: SalesInvoicePage) => ({ type: SALES_INVOICE_ACTIONS.LOAD_SUCCESS, payload: page })

export const loadSalesInvoicesFailure = (message: string) => ({ type: SALES_INVOICE_ACTIONS.LOAD_FAILURE, payload: message })

export const setSalesInvoiceSearch = (searchTerm: string) => ({ type: SALES_INVOICE_ACTIONS.SET_SEARCH, payload: searchTerm })

export const setSalesInvoiceStatusFilter = (status: SalesInvoiceStatusFilter) => ({ type: SALES_INVOICE_ACTIONS.SET_STATUS_FILTER, payload: status })

// Dates are YYYY-MM-DD, or '' to clear the bound
export const setSalesInvoiceFromDate = (fromDate: string) => ({ type: SALES_INVOICE_ACTIONS.SET_FROM_DATE, payload: fromDate })

export const setSalesInvoiceToDate = (toDate: string) => ({ type: SALES_INVOICE_ACTIONS.SET_TO_DATE, payload: toDate })

export const setSalesInvoicePage = (pageNumber: number) => ({ type: SALES_INVOICE_ACTIONS.SET_PAGE, payload: pageNumber })

export const setSalesInvoicePageSize = (pageSize: number) => ({ type: SALES_INVOICE_ACTIONS.SET_PAGE_SIZE, payload: pageSize })

// Opens the detail view and fetches the invoice by id
export const selectSalesInvoice = (id: string) => ({ type: SALES_INVOICE_ACTIONS.SELECT, payload: id })

export const clearSalesInvoiceSelection = () => ({ type: SALES_INVOICE_ACTIONS.CLEAR_SELECTION })

export const loadSalesInvoiceByIdSuccess = (invoice: SalesInvoice) => ({ type: SALES_INVOICE_ACTIONS.LOAD_BY_ID_SUCCESS, payload: invoice })

export const loadSalesInvoiceByIdFailure = (message: string) => ({ type: SALES_INVOICE_ACTIONS.LOAD_BY_ID_FAILURE, payload: message })

// The selected invoice's vehicle record (year, color, warehouse), or null when it couldn't be loaded
export const loadSalesInvoiceVehicleSuccess = (vehicle: Vehicle | null) => ({ type: SALES_INVOICE_ACTIONS.LOAD_VEHICLE_SUCCESS, payload: vehicle })

// Customers, employees and available vehicles for the form's dropdowns and the table's salesperson names
export const loadSalesInvoiceOptions = () => ({ type: SALES_INVOICE_ACTIONS.LOAD_OPTIONS })

export const loadSalesInvoiceOptionsSuccess = (options: SalesInvoiceOptions) => ({ type: SALES_INVOICE_ACTIONS.LOAD_OPTIONS_SUCCESS, payload: options })

export const loadSalesInvoiceOptionsFailure = (message: string) => ({ type: SALES_INVOICE_ACTIONS.LOAD_OPTIONS_FAILURE, payload: message })

// "Save Draft": AddSalesInvoice
export const createSalesInvoice = (values: SalesInvoiceFormValues) => ({ type: SALES_INVOICE_ACTIONS.CREATE, payload: values })

// "Post Invoice": CreateAndPost, which creates the invoice already posted and records the payment received
export const postSalesInvoice = (values: SalesInvoiceFormValues) => ({ type: SALES_INVOICE_ACTIONS.POST, payload: values })

// "Save Changes" on an existing draft: UpdateDraft
export const updateSalesInvoiceDraft = (request: SalesInvoiceDraftRequest) => ({ type: SALES_INVOICE_ACTIONS.UPDATE, payload: request })

// "Post Invoice" on an existing draft: UpdateDraft, then PostInvoice with the payment
export const postSalesInvoiceDraft = (request: SalesInvoiceDraftRequest) => ({ type: SALES_INVOICE_ACTIONS.POST_DRAFT, payload: request })

export const saveSalesInvoiceSuccess =() => ({ type: SALES_INVOICE_ACTIONS.SAVE_SUCCESS })

export const saveSalesInvoiceFailure = (error: SalesInvoiceSaveError) => ({ type: SALES_INVOICE_ACTIONS.SAVE_FAILURE, payload: error })

// Clears the save status and errors, e.g. when the form is opened or closed or the success banner is dismissed
export const resetSalesInvoiceSave = () => ({ type: SALES_INVOICE_ACTIONS.RESET_SAVE })

export const cancelSalesInvoice = (request: SalesInvoiceCancelRequest) => ({ type: SALES_INVOICE_ACTIONS.CANCEL, payload: request })

export const cancelSalesInvoiceSuccess = () => ({ type: SALES_INVOICE_ACTIONS.CANCEL_SUCCESS })

export const cancelSalesInvoiceFailure = (message: string) => ({ type: SALES_INVOICE_ACTIONS.CANCEL_FAILURE, payload: message })

// Clears the cancel status and error when the cancel dialog is opened or closed
export const resetSalesInvoiceCancel = () => ({ type: SALES_INVOICE_ACTIONS.RESET_CANCEL })

// One customer's invoices, for the Sales Invoices card on their profile
export const loadCustomerSalesInvoices = (customerId: string) => ({ type: SALES_INVOICE_ACTIONS.LOAD_CUSTOMER_INVOICES, payload: customerId })

export const loadCustomerSalesInvoicesSuccess = (result: CustomerSalesInvoices) => ({ type: SALES_INVOICE_ACTIONS.LOAD_CUSTOMER_INVOICES_SUCCESS, payload: result })

export const loadCustomerSalesInvoicesFailure = (message: string) => ({ type: SALES_INVOICE_ACTIONS.LOAD_CUSTOMER_INVOICES_FAILURE, payload: message })

// Leaving the customer: cancels an in-flight load and forgets their invoices
export const clearCustomerSalesInvoices = () => ({ type: SALES_INVOICE_ACTIONS.CLEAR_CUSTOMER_INVOICES })

export type SalesInvoicesAction =
  | ReturnType<typeof loadSalesInvoices>
  | ReturnType<typeof loadSalesInvoicesSuccess>
  | ReturnType<typeof loadSalesInvoicesFailure>
  | ReturnType<typeof setSalesInvoiceSearch>
  | ReturnType<typeof setSalesInvoiceStatusFilter>
  | ReturnType<typeof setSalesInvoiceFromDate>
  | ReturnType<typeof setSalesInvoiceToDate>
  | ReturnType<typeof setSalesInvoicePage>
  | ReturnType<typeof setSalesInvoicePageSize>
  | ReturnType<typeof selectSalesInvoice>
  | ReturnType<typeof clearSalesInvoiceSelection>
  | ReturnType<typeof loadSalesInvoiceByIdSuccess>
  | ReturnType<typeof loadSalesInvoiceByIdFailure>
  | ReturnType<typeof loadSalesInvoiceVehicleSuccess>
  | ReturnType<typeof loadSalesInvoiceOptions>
  | ReturnType<typeof loadSalesInvoiceOptionsSuccess>
  | ReturnType<typeof loadSalesInvoiceOptionsFailure>
  | ReturnType<typeof createSalesInvoice>
  | ReturnType<typeof postSalesInvoice>
  | ReturnType<typeof updateSalesInvoiceDraft>
  | ReturnType<typeof postSalesInvoiceDraft>
  | ReturnType<typeof saveSalesInvoiceSuccess>
  | ReturnType<typeof saveSalesInvoiceFailure>
  | ReturnType<typeof resetSalesInvoiceSave>
  | ReturnType<typeof cancelSalesInvoice>
  | ReturnType<typeof cancelSalesInvoiceSuccess>
  | ReturnType<typeof cancelSalesInvoiceFailure>
  | ReturnType<typeof resetSalesInvoiceCancel>
  | ReturnType<typeof loadCustomerSalesInvoices>
  | ReturnType<typeof loadCustomerSalesInvoicesSuccess>
  | ReturnType<typeof loadCustomerSalesInvoicesFailure>
  | ReturnType<typeof clearCustomerSalesInvoices>
