import { EMPLOYEE_ENDPOINTS, SALES_INVOICE_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { customersApi } from '../customers/customers.api'
import { employeesApi } from '../employees/employees.api'
import { mapEmployeeCollection } from '../employees/employees.mappers'
import { vehiclesApi } from '../vehicles/vehicles.api'
import type {
  SalesInvoice,
  SalesInvoiceCancelRequest,
  SalesInvoiceFormValues,
  SalesInvoiceOptions,
  SalesInvoicePage,
  SalesInvoiceQuery,
} from '../../types/salesInvoices'
import {
  mapSalesInvoice,
  mapSalesInvoiceCollection,
  readHasNext,
  toSalesInvoiceCancelDto,
  toSalesInvoiceRequestDto,
} from './salesInvoices.mappers'

interface SalesInvoiceQueryParams {
  PageNumber: number
  PageSize: number
  Lifecycle?: string
  Status?: string
  FromDate?: string
  ToDate?: string
  SearchTerm?: string
}

// Enough for every customer, employee or vehicle in one request; the GetAll endpoints have no unpaged mode
const OPTIONS_PAGE_SIZE = 100

async function getSalesInvoices(query: SalesInvoiceQuery, signal?: AbortSignal): Promise<SalesInvoicePage> {
  const params: SalesInvoiceQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.status === 'draft' || query.status === 'posted' || query.status === 'cancelled') {
    params.Lifecycle = query.status
  } else if (query.status !== 'all') {
    // Payment statuses only mean something on posted invoices; a cancelled invoice is still "unpaid" on the API
    params.Lifecycle = 'posted'
    params.Status = query.status
  }
  if (query.fromDate) params.FromDate = query.fromDate
  if (query.toDate) params.ToDate = query.toDate
  const searchTerm = query.searchTerm.trim()
  if (searchTerm) params.SearchTerm = searchTerm

  const { data } = await customerClient.get<unknown>(SALES_INVOICE_ENDPOINTS.getAllSalesInvoices, { params, signal })
  const items = mapSalesInvoiceCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getSalesInvoiceById(id: string, signal?: AbortSignal): Promise<SalesInvoice> {
  const { data } = await customerClient.get<unknown>(SALES_INVOICE_ENDPOINTS.getSalesInvoiceById, { params: { id }, signal })
  return mapSalesInvoice(data)
}

// The list is refetched afterwards, so the response body isn't needed
async function addSalesInvoice(values: SalesInvoiceFormValues, signal?: AbortSignal): Promise<void> {
  await customerClient.post(SALES_INVOICE_ENDPOINTS.addSalesInvoice, toSalesInvoiceRequestDto(values), { signal })
}

async function postSalesInvoice(values: SalesInvoiceFormValues, signal?: AbortSignal): Promise<void> {
  await customerClient.post(SALES_INVOICE_ENDPOINTS.postSalesInvoice, toSalesInvoiceRequestDto(values), { signal })
}

async function cancelSalesInvoice({ id, reason }: SalesInvoiceCancelRequest, signal?: AbortSignal): Promise<void> {
  await customerClient.post(SALES_INVOICE_ENDPOINTS.cancelSalesInvoice, toSalesInvoiceCancelDto(reason), { params: { id }, signal })
}

// Invoices only carry ids for the salesperson, so names come from every employee (a salesperson may since have
// left); the form picks from the active salespeople and the vehicles still available for sale
async function getOptions(signal?: AbortSignal): Promise<SalesInvoiceOptions> {
  const [customerPage, employeePage, salespeopleResponse, vehiclePage] = await Promise.all([
    customersApi.getCustomers({ pageNumber: 1, pageSize: OPTIONS_PAGE_SIZE, status: 'all', searchTerm: '' }, signal),
    employeesApi.getEmployees({ pageNumber: 1, pageSize: OPTIONS_PAGE_SIZE, department: 'all', status: 'all', searchTerm: '' }, signal),
    customerClient.get<unknown>(EMPLOYEE_ENDPOINTS.getActiveSalespeople, { signal }),
    vehiclesApi.getVehicles({ pageNumber: 1, pageSize: OPTIONS_PAGE_SIZE, status: 'available', searchTerm: '' }, signal),
  ])
  return {
    customers: customerPage.items,
    employees: employeePage.items,
    salespeople: mapEmployeeCollection(salespeopleResponse.data),
    vehicles: vehiclePage.items,
  }
}

export const salesInvoicesApi = {
  getSalesInvoices,
  getSalesInvoiceById,
  addSalesInvoice,
  postSalesInvoice,
  cancelSalesInvoice,
  getOptions,
}
