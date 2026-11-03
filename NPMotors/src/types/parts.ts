import type { VendorType } from './vendors'

// GetAllParts filters by one category (free text on the API, so 'all' or any category name) and,
// with LowStockOnly=true, by low stock
export type PartCategoryFilter = string
export type PartStockFilter = 'all' | 'low'

export interface Part {
  id: string
  partNumber: string
  // The design's "Description" column
  name: string
  category: string
  vendorId: string
  costPrice: number
  sellPrice: number
  quantity: number
  reorderLevel: number
  warehouse: string
  // Cost price × quantity, as the API computes it (the design's "Stock Value")
  inventoryValue: number
  isLowStock: boolean
}

export interface PartQuery {
  pageNumber: number
  pageSize: number
  category: PartCategoryFilter
  stock: PartStockFilter
  searchTerm: string
}

export interface PartPage {
  items: Part[]
  hasNext: boolean
}

// Parts only carry vendor_Id, so the table, detail and Receive Parts form look vendor names up from these
export interface PartVendorOption {
  id: string
  name: string
  type: VendorType
}

// The Receive Parts "Pay From" choices
export interface PartBankAccountOption {
  id: string
  name: string
  accountNumber: string
}

// What the Receive Parts form picks from: every part (not only the table's page) and the bank accounts
export interface PartReceiveOptions {
  parts: Part[]
  bankAccounts: PartBankAccountOption[]
}

// One receipt line as sent to UpdatePart, which only stores the quantity received
export interface PartReceiveLine {
  partId: string
  quantity: number
}

// Lines are received one request at a time; `received` lists those saved before the failure
export interface PartReceiveFailure {
  message: string
  received: PartReceiveLine[]
}
