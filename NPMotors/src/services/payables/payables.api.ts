import { AP_BILL_ENDPOINTS } from '../api/apiConstants'
import { customerClient } from '../api/customerClient'
import { vendorsApi } from '../vendors/vendors.api'
import type {
  PayableDetail,
  PayablePage,
  PayablePayment,
  PayableQuery,
  PayableVendorOption,
  VendorPaymentRequest,
} from '../../types/payables'
import {
  mapPayableCollection,
  mapPayableDetail,
  mapPayablePaymentHistory,
  readHasNext,
  toPayableVendorOptions,
  toVendorPaymentDto,
} from './payables.mappers'

interface PayableQueryParams {
  PageNumber: number
  PageSize: number
  Status?: string
  VendorId?: string
  AsOfDate?: string
}

// The API's largest page; vendors past the first 100 won't be in the filter
const VENDOR_OPTIONS_PAGE_SIZE = 100

async function getPayables(query: PayableQuery, signal?: AbortSignal): Promise<PayablePage> {
  const params: PayableQueryParams = { PageNumber: query.pageNumber, PageSize: query.pageSize }
  if (query.status !== 'all') params.Status = query.status
  if (query.vendorId !== 'all') params.VendorId = query.vendorId
  if (query.asOfDate) params.AsOfDate = query.asOfDate

  const { data } = await customerClient.get<unknown>(AP_BILL_ENDPOINTS.getAllApBills, { params, signal })
  const items = mapPayableCollection(data)
  // Without metadata, a full page means there may be another one
  return { items, hasNext: readHasNext(data) ?? items.length === query.pageSize }
}

async function getPayableById(id: string, signal?: AbortSignal): Promise<PayableDetail> {
  const { data } = await customerClient.get<unknown>(AP_BILL_ENDPOINTS.getApById, { params: { id }, signal })
  return mapPayableDetail(data)
}

async function getPaymentHistory(apBillId: string, signal?: AbortSignal): Promise<PayablePayment[]> {
  const { data } = await customerClient.get<unknown>(AP_BILL_ENDPOINTS.getPaymentHistory(apBillId), { signal })
  return mapPayablePaymentHistory(data)
}

// The bill, list and history are refetched afterwards, so the response body isn't needed
async function recordVendorPayment({ apBillId, values }: VendorPaymentRequest, signal?: AbortSignal): Promise<void> {
  await customerClient.post(AP_BILL_ENDPOINTS.recordVendorPayment(apBillId), toVendorPaymentDto(values), { signal })
}

async function getVendorOptions(signal?: AbortSignal): Promise<PayableVendorOption[]> {
  const page = await vendorsApi.getVendors({ pageNumber: 1, pageSize: VENDOR_OPTIONS_PAGE_SIZE, type: 'all', searchTerm: '' }, signal)
  return toPayableVendorOptions(page.items)
}

export const payablesApi = { getPayables, getPayableById, getPaymentHistory, recordVendorPayment, getVendorOptions }
