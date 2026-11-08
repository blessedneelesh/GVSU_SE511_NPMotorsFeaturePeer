import type {
  SalesInvoice,
  SalesInvoiceFormValues,
  SalesInvoiceOptions,
  SalesInvoicePage,
  SalesInvoiceSaveError,
} from '../../types/salesInvoices'
import { customer, sparseCustomer } from './customers'
import { employee } from './employees'
import { availableVehicle } from './vehicles'

// Posted with nothing paid, so it can be cancelled. Sold to customer C001 by salesperson 12;
// 30,250 + 8% tax (2,420) + 450 fees = 33,120
export const postedInvoice: SalesInvoice = {
  id: '6',
  number: 'INV-2026-0006',
  invoiceDate: '2026-10-15',
  dueDate: '2026-11-14',
  customerId: 'C001',
  customerName: 'John Smith',
  salespersonId: '12',
  vehicleId: '24',
  vin: '4T1G11AK0RU000024',
  make: 'Toyota',
  model: 'Camry',
  vehicle: 'Toyota Camry',
  vehicleStatus: 'sold',
  sellingPrice: 30250,
  vehicleTotalCost: 26800,
  salePrice: 30250,
  tax: 2420,
  fees: 450,
  discount: 0,
  total: 33120,
  paid: 0,
  balance: 33120,
  lifecycle: 'posted',
  paymentStatus: 'unpaid',
  cancelReason: '',
}

// Partly paid, with a discount, by a salesperson who isn't in the employees list (shows "Employee #1");
// 44,500 + 3,560 tax + 450 fees − 500 discount = 48,010, of which 10,000 is paid
export const partialInvoice: SalesInvoice = {
  id: '3',
  number: 'INV-2026-0003',
  invoiceDate: '2026-09-20',
  dueDate: '2026-10-20',
  customerId: 'C001',
  customerName: 'John Smith',
  salespersonId: '1',
  vehicleId: '2',
  vin: '1GCUYDED5NZ123456',
  make: 'Chevrolet',
  model: 'Silverado 1500',
  vehicle: 'Chevrolet Silverado 1500',
  vehicleStatus: 'sold',
  sellingPrice: 44500,
  vehicleTotalCost: 39500,
  salePrice: 44500,
  tax: 3560,
  fees: 450,
  discount: 500,
  total: 48010,
  paid: 10000,
  balance: 38010,
  lifecycle: 'posted',
  paymentStatus: 'partial',
  cancelReason: '',
}

// Not posted: no payment status, and paid/balance show '—' in the table
export const draftInvoice: SalesInvoice = {
  ...postedInvoice,
  id: '8',
  number: 'INV-2026-0008',
  invoiceDate: '2026-11-01',
  dueDate: '2026-12-01',
  vehicleStatus: 'reserved',
  lifecycle: 'draft',
  paymentStatus: null,
}

export const cancelledInvoice: SalesInvoice = {
  ...postedInvoice,
  id: '7',
  number: 'INV-2026-0007',
  vehicleStatus: 'available',
  lifecycle: 'cancelled',
  paymentStatus: null,
  cancelReason: 'Customer financing fell through',
}

// Optional fields empty and no id: exercises the '—' fallbacks and the disabled links
export const sparseInvoice: SalesInvoice = {
  id: '',
  number: 'INV-SPARSE',
  invoiceDate: '',
  dueDate: '',
  customerId: '',
  customerName: '',
  salespersonId: '',
  vehicleId: '',
  vin: '',
  make: '',
  model: '',
  vehicle: '',
  vehicleStatus: '',
  sellingPrice: 0,
  vehicleTotalCost: 0,
  salePrice: 0,
  tax: 0,
  fees: 0,
  discount: 0,
  total: 0,
  paid: 0,
  balance: 0,
  lifecycle: 'posted',
  paymentStatus: 'paid',
  cancelReason: '',
}

export const salesInvoicePage: SalesInvoicePage = {
  items: [postedInvoice, draftInvoice],
  hasNext: true,
}

// The inactive customer is left out of the form's dropdown; the Camry is the only vehicle still for sale
export const salesInvoiceOptions: SalesInvoiceOptions = {
  customers: [customer, sparseCustomer],
  employees: [employee],
  salespeople: [employee],
  vehicles: [availableVehicle],
}

// What the form sends for the Camry with no discount (dates are overridden by tests that fill the form)
export const salesInvoiceFormValues: SalesInvoiceFormValues = {
  customerId: 'C001',
  salespersonId: '12',
  vehicleId: '24',
  invoiceDate: '2026-11-04',
  dueDate: '2026-12-04',
  tax: '2420.00',
  fees: '450.00',
  discount: '',
}

export const salesInvoiceSaveError: SalesInvoiceSaveError = {
  message: 'Customer does not exist.',
  fieldErrors: { discount: 'The field Discount must be between 0 and 999999999999.99.' },
}
