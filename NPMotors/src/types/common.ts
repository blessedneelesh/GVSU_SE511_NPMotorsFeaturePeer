// Types shared by every feature slice
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

// The API's PaymentMethod enum, as its JsonStringEnumConverter (camelCase) reads it; used by sales invoices and receipts
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check'
