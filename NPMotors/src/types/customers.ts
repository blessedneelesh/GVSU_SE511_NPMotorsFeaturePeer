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
