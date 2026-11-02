import type { VehicleStatus } from '../../types/vehicles'

// Same whole-dollar format as Customers ("-$1,200" for losses)
export { formatCurrency } from '../CustomersPage/customerMetrics'

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
}

// Badge colours from the design: Available green, Reserved amber, Sold red
export const VEHICLE_STATUS_BADGES: Record<VehicleStatus, string> = {
  available: 'badge-posted',
  reserved: 'badge-pending',
  sold: 'badge-cancelled',
}

// The design shows the margin with one decimal ("11.4%")
export const formatMargin = (margin: number) => `${margin.toFixed(1)}%`

// The list shows the last 8 VIN characters, which identify the individual vehicle
export const shortVin = (vin: string) => vin.slice(-8)
