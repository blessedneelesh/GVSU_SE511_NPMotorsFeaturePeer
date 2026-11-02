import type { Vendor, VendorFormValues, VendorPage, VendorSaveError } from '../../types/vendors'

// Mirrors a real GetAllVendors row; balance differs from totalPurchases so each money cell is distinct
export const vendor: Vendor = {
  id: '5',
  name: 'Detroit Dealer Exchange',
  contact: 'Omar Haddad',
  phone: '313-555-0205',
  email: 'trade@detroitdealerx.example',
  address: '1800 Fort St, Detroit, MI 48216',
  type: 'vehicles',
  balance: 3500,
  totalPurchases: 28000,
  status: 'Active',
}

// Optional fields left empty, no id, no balance, inactive: exercises the '—' fallbacks and the disabled links
export const sparseVendor: Vendor = {
  id: '',
  name: 'Jane Supply',
  contact: '',
  phone: '',
  email: '',
  address: '',
  type: 'parts',
  balance: 0,
  totalPurchases: 0,
  status: 'Inactive',
}

export const vendorPage: VendorPage = {
  items: [vendor, sparseVendor],
  hasNext: true,
}

export const vendorFormValues: VendorFormValues = {
  name: 'Lakeshore Tire',
  contact: 'Ann Lee',
  phone: '616-555-0199',
  email: 'ann@lakeshore.example',
  address: '10 Shore Rd, Holland, MI 49423',
  type: 'vehicles',
  status: 'Active',
}

export const vendorSaveError: VendorSaveError = {
  message: 'Something went wrong while saving.',
  fieldErrors: { name: 'The Name field is required.' },
}
