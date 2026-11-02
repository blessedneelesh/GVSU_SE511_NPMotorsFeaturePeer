// The API's vehicle statuses (lower case on the wire)
export type VehicleStatus = 'available' | 'reserved' | 'sold'
// GetAllVehicles only accepts Status=available or Status=reserved; any other value is a 400
export type VehicleStatusFilter = 'all' | 'available' | 'reserved'

export interface Vehicle {
  id: string
  vendorId: string
  vendorName: string
  vin: string
  make: string
  model: string
  year: number
  // "2022 Chevrolet Silverado 1500"; built by the mapper so the list, detail and breadcrumb agree
  title: string
  color: string
  // YYYY-MM-DD, or '' when the API has none
  purchaseDate: string
  warehouse: string
  purchasePrice: number
  additionalCosts: number
  totalCost: number
  sellingPrice: number
  grossProfit: number
  // Percent of the selling price, as the API computes it
  grossMargin: number
  isAvailable: boolean
  status: VehicleStatus
}

export interface VehicleQuery {
  pageNumber: number
  pageSize: number
  status: VehicleStatusFilter
  searchTerm: string
}

export interface VehiclePage {
  items: Vehicle[]
  hasNext: boolean
}

// Vendors the Add Vehicle form can pick from (vehicle vendors only, as in the design)
export interface VehicleVendorOption {
  id: string
  name: string
}

// Form state: what the user types (numbers and the vendor id stay strings until the DTO), before it becomes VehicleCreateDto
export interface VehicleFormValues {
  vendorId: string
  vin: string
  make: string
  model: string
  year: string
  color: string
  purchaseDate: string
  warehouse: string
  purchasePrice: string
  additionalCosts: string
  sellingPrice: string
}

export type VehicleFormField = keyof VehicleFormValues

export type VehicleFieldErrors = Partial<Record<VehicleFormField, string>>

export interface VehicleSaveError {
  message: string
  fieldErrors: VehicleFieldErrors
}
