export type VendorStatus = 'Active' | 'Inactive'

// The API's VendorType enum (vehicles = 0, parts = 1, service = 2), spelled as it serializes them
export type VendorType = 'vehicles' | 'parts' | 'service'
export type VendorTypeFilter = 'all' | VendorType

export interface Vendor {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  address: string
  type: VendorType
  balance: number
  totalPurchases: number
  status: VendorStatus
}

export interface VendorQuery {
  pageNumber: number
  pageSize: number
  type: VendorTypeFilter
  searchTerm: string
}

export interface VendorPage {
  items: Vendor[]
  hasNext: boolean
}

// Form state: what the user types, before it is converted to the API's VendorCreateDto
export interface VendorFormValues {
  name: string
  contact: string
  phone: string
  email: string
  address: string
  type: VendorType
  status: VendorStatus
}

export type VendorFormField = keyof VendorFormValues

export type VendorFieldErrors = Partial<Record<VendorFormField, string>>

export interface VendorSaveError {
  message: string
  fieldErrors: VendorFieldErrors
}
