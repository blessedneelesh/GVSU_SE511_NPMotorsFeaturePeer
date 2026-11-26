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

// Vendors the Purchase Vehicle wizard can pick from (vehicle vendors only, as in the design)
export interface VehicleVendorOption {
  id: string
  name: string
}

// How a purchase is settled. The API's PaidInFull / Partial / Credit; anything left unpaid becomes an AP bill.
export type VehiclePaymentCondition = 'paidInFull' | 'partial' | 'credit'

// The API's Cash / Check / Card / Transfer
export type VehiclePaymentMethod = 'cash' | 'check' | 'card' | 'transfer'

// Active bank accounts the Purchase Vehicle payment step can pay from
export interface VehicleBankAccountOption {
  id: string
  name: string
  bankName: string
  bookBalance: number
}

// Purchase Vehicle wizard state. The design splits the acquisition costs into sales tax, transport and other;
// the API stores their sum as additional_Costs.
export interface VehiclePurchaseFormValues {
  vendorId: string
  purchaseDate: string
  make: string
  model: string
  year: string
  color: string
  warehouse: string
  vin: string
  purchasePrice: string
  salesTax: string
  transportCost: string
  otherCosts: string
  sellingPrice: string
  paymentCondition: VehiclePaymentCondition
  // Only read for a partial payment; paid in full sends the total cost and credit sends 0
  amountPaid: string
  paymentMethod: VehiclePaymentMethod
  bankAccountId: string
  reference: string
  // The AP bill's due date, when part of the cost is left on account
  dueDate: string
}

export type VehiclePurchaseFormField = keyof VehiclePurchaseFormValues

export type VehiclePurchaseFieldErrors = Partial<Record<VehiclePurchaseFormField, string>>

export interface VehiclePurchaseSaveError {
  message: string
  fieldErrors: VehiclePurchaseFieldErrors
}

// What PurchaseVehicle returns, for the confirmation banner on Vehicle Inventory
export interface VehiclePurchaseResult {
  vehicleId: string
  title: string
  totalCost: number
  amountPaid: number
  balanceDue: number
  // "paid", "partial" or "unpaid"
  paymentStatus: string
  // Set when part of the cost was left on account, or a bank payment was made
  apBillNumber: string
  paymentNumber: string
}
