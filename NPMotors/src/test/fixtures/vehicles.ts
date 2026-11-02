import type { Vehicle, VehicleFormValues, VehiclePage, VehicleSaveError, VehicleVendorOption } from '../../types/vehicles'

// Shaped like a real GetAllVehicles sold row; every money figure differs so each stat is distinct
export const vehicle: Vehicle = {
  id: '2',
  vendorId: '1',
  vendorName: 'AutoNation',
  vin: '1GCUYDED5NZ123456',
  make: 'Chevrolet',
  model: 'Silverado 1500',
  year: 2022,
  title: '2022 Chevrolet Silverado 1500',
  color: 'Black',
  purchaseDate: '2026-03-14',
  warehouse: 'Main Lot',
  purchasePrice: 38000,
  additionalCosts: 1500,
  totalCost: 39500,
  sellingPrice: 44500,
  grossProfit: 5000,
  grossMargin: 11.24,
  isAvailable: false,
  status: 'sold',
}

// Still for sale, so the detail view shows the projected profit instead of the realized one
export const availableVehicle: Vehicle = {
  id: '24',
  vendorId: '5',
  vendorName: 'CarMax Wholesale',
  vin: '4T1G11AK0RU000024',
  make: 'Toyota',
  model: 'Camry',
  year: 2024,
  title: '2024 Toyota Camry',
  color: 'Silver',
  purchaseDate: '2026-09-01',
  warehouse: 'Showroom',
  purchasePrice: 26000,
  additionalCosts: 800,
  totalCost: 26800,
  sellingPrice: 30250,
  grossProfit: 3450,
  grossMargin: 11.4,
  isAvailable: true,
  status: 'available',
}

// Optional fields empty, no id, a loss, reserved: exercises the '—' fallbacks, the red profit and the disabled link
export const sparseVehicle: Vehicle = {
  id: '',
  vendorId: '',
  vendorName: '',
  vin: '',
  make: '',
  model: '',
  year: 0,
  title: 'Unnamed vehicle',
  color: '',
  purchaseDate: '',
  warehouse: '',
  purchasePrice: 1000,
  additionalCosts: 200,
  totalCost: 1200,
  sellingPrice: 0,
  grossProfit: -1200,
  grossMargin: 0,
  isAvailable: false,
  status: 'reserved',
}

export const vehiclePage: VehiclePage = {
  items: [vehicle, sparseVehicle],
  hasNext: true,
}

export const vehicleVendorOptions: VehicleVendorOption[] = [
  { id: '1', name: 'AutoNation' },
  { id: '5', name: 'CarMax Wholesale' },
]

// What a filled-in Add Vehicle form produces (the dialog defaults purchaseDate to today, so tests override it)
export const vehicleFormValues: VehicleFormValues = {
  vendorId: '1',
  vin: '1FTFW1E50PFA00001',
  make: 'Ford',
  model: 'F-150',
  year: '2024',
  color: 'Blue',
  purchaseDate: '2026-11-02',
  warehouse: 'Lot B',
  purchasePrice: '30000',
  additionalCosts: '500',
  sellingPrice: '36000',
}

export const vehicleSaveError: VehicleSaveError = {
  message: 'Something went wrong while saving.',
  fieldErrors: { vin: 'The Vin field is required.' },
}
