export type CustomerStatus = 'Active' | 'Inactive'
export type CustomerStatusFilter = 'all' | 'active' | 'inactive'

export interface Customer {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  balance: number
  totalPurchases: number
  status: CustomerStatus
}

export interface CustomerQuery {
  pageNumber: number
  pageSize: number
  status: CustomerStatusFilter
  searchTerm: string
}

export interface CustomerPage {
  items: Customer[]
  hasNext: boolean
}

// Form state: what the user types, before it is converted to the API's CustomerCreateDto
export interface CustomerFormValues {
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zip: string
  status: CustomerStatus
}

export type CustomerFormField = keyof CustomerFormValues

export type CustomerFieldErrors = Partial<Record<CustomerFormField, string>>

export interface CustomerSaveError {
  message: string
  fieldErrors: CustomerFieldErrors
}
