import type { Customer, CustomerFormValues, CustomerPage, CustomerSaveError } from '../../types/customers'

// C001 matches the sample sales invoices, so the detail view has an invoice row to show
export const customer: Customer = {
  id: 'C001',
  firstName: 'John',
  lastName: 'Smith',
  fullName: 'John Smith',
  email: 'john.smith@email.com',
  phone: '(214) 555-0101',
  address: '1250 Motor Mile Drive',
  city: 'Dallas',
  state: 'TX',
  zip: '75201',
  balance: 1200,
  totalPurchases: 28314,
  status: 'Active',
}

// Optional fields left empty, no id, inactive: exercises the '—' fallbacks and the disabled name link
export const sparseCustomer: Customer = {
  id: '',
  firstName: 'Jane',
  lastName: 'Doe',
  fullName: 'Jane Doe',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  balance: 0,
  totalPurchases: 0,
  status: 'Inactive',
}

export const customerPage: CustomerPage = {
  items: [customer, sparseCustomer],
  hasNext: true,
}

export const formValues: CustomerFormValues = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '(214) 555-0199',
  email: 'ada@npmotors.com',
  address: '10 Analytical Way',
  city: 'Austin',
  state: 'TX',
  zip: '73301',
  status: 'Active',
}

export const saveError: CustomerSaveError = {
  message: 'Something went wrong while saving.',
  fieldErrors: { email: 'Email already exists' },
}
