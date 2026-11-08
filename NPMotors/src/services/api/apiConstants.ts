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
  // Bare array of active employees with is_Salesperson; the Sales Invoice form's salesperson list
  getActiveSalespeople: 'Employee/GetActiveSalespeople',
} as const

// Also on the Customers API origin, so vehicle requests reuse customerClient
export const VEHICLE_ENDPOINTS = {
  getAllVehicles: 'Vehicle/GetAllVehicles',
  getVehicleById: 'Vehicle/GetVehicleById',
  addVehicle: 'Vehicle/AddVehicle',
} as const

// Also on the Customers API origin, so part requests reuse customerClient.
// UpdatePart is the stock receipt: it adds quantity_Received to the part's quantity.
export const PART_ENDPOINTS = {
  getAllParts: 'Part/GetAllParts',
  getPartById: 'Part/GetPartById',
  updatePart: 'Part/UpdatePart',
} as const

// Also on the Customers API origin, so sales invoice requests reuse customerClient.
// AddSalesInvoice saves a draft and PostSalesInvoice posts a new invoice; both take SalesInvoiceCreateDto.
// CancelSalesInvoice takes ?id= and { reason }, and only accepts posted invoices with nothing paid.
export const SALES_INVOICE_ENDPOINTS = {
  getAllSalesInvoices: 'SalesInvoice/GetAllSalesInvoices',
  getSalesInvoiceById: 'SalesInvoice/GetSalesInvoiceById',
  addSalesInvoice: 'SalesInvoice/AddSalesInvoice',
  postSalesInvoice: 'SalesInvoice/PostSalesInvoice',
  cancelSalesInvoice: 'SalesInvoice/CancelSalesInvoice',
} as const

// Also on the Customers API origin, so bank account requests reuse customerClient.
// The Banks & Accounts page and the Receive Parts "Pay From" list both use it.
export const BANK_ACCOUNT_ENDPOINTS = {
  getAllBankAccounts: 'BankAccount/GetAllBankAccounts',
  getBankAccountById: 'BankAccount/GetBankAccountById',
  addBankAccount: 'BankAccount/AddBankAccount',
} as const

// Also on the Customers API origin, so transaction requests reuse customerClient. Transactions are read-only.
export const TRANSACTION_ENDPOINTS = {
  getAllTransactions: 'Transaction/GetAllTransactions',
  getTransactionById: 'Transaction/GetTransactionById',
} as const

// Also on the Customers API origin, so statement line requests reuse customerClient. The bank feed is read-only.
export const STATEMENT_LINE_ENDPOINTS = {
  getStatementLines: 'StatementLine/GetStatementLines',
} as const

// Also on the Customers API origin, so transfer requests reuse customerClient. There is only a create endpoint for now.
export const TRANSFER_ENDPOINTS = {
  createTransfer: 'Transfer/CreateTransfer',
} as const
