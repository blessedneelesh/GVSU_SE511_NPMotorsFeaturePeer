import type { VendorType } from '../../types/vendors'

// Same whole-dollar format as Customers
export { formatCurrency } from '../CustomersPage/customerMetrics'

// Labels from the Figma design; values are the API's VendorType names
export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  vehicles: 'Vehicle',
  parts: 'Parts',
  service: 'Service',
}

export const VENDOR_TYPES = Object.keys(VENDOR_TYPE_LABELS) as VendorType[]
