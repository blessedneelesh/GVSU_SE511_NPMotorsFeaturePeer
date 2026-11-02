// In dev, requests go through the Vite proxy (same origin), so CORS and the dev server's port don't matter.
// Production builds call the .NET API directly, which must allow the frontend origin via CORS.
export const CUSTOMER_API_BASE_URL: string =
  import.meta.env.VITE_CUSTOMER_API_URL ?? (import.meta.env.DEV ? '/' : 'https://localhost:7003/')

export const CUSTOMER_ENDPOINTS = {
  getAllCustomers: 'Customer/GetAllCustomers',
  getCustomerById: 'Customer/GetCustomerById',
  addCustomer: 'Customer/AddCustomer',
} as const

// Same .NET API (and origin) as Customers, so vendor requests reuse customerClient
export const VENDOR_ENDPOINTS = {
  getAllVendors: 'Vendor/GetAllVendors',
  getVendorById: 'Vendor/GetVendorById',
  addVendor: 'Vendor/AddVendor',
} as const

// Also on the Customers API origin, so employee requests reuse customerClient
export const EMPLOYEE_ENDPOINTS = {
  getAllEmployees: 'Employee/GetAllEmployees',
  getEmployeeById: 'Employee/GetEmployeeById',
  addEmployee: 'Employee/AddEmployee',
} as const

// Also on the Customers API origin, so vehicle requests reuse customerClient
export const VEHICLE_ENDPOINTS = {
  getAllVehicles: 'Vehicle/GetAllVehicles',
  getVehicleById: 'Vehicle/GetVehicleById',
  addVehicle: 'Vehicle/AddVehicle',
} as const
