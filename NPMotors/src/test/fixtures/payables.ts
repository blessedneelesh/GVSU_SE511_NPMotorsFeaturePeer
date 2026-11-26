import type {
  Payable,
  PayableDetail,
  PayablePage,
  PayablePayment,
  PayableVendorOption,
  VendorPaymentFormValues,
  VendorPaymentTarget,
} from '../../types/payables'

// Matches AP bill 4 of the running API's sample data, after mapping: unpaid and long overdue
export const overduePayable: Payable = {
  id: '4',
  number: 'BILL-0020',
  vendorId: '3',
  vendorName: 'Honda Auto Parts',
  date: '2024-03-12',
  dueDate: '2024-04-26',
  amount: 12400,
  paid: 0,
  balance: 12400,
  daysOverdue: 943,
  agingBucket: 'Over 90',
  status: 'Overdue',
}

// Matches AP bill 8: overdue by under 30 days
export const recentOverduePayable: Payable = {
  id: '8',
  number: 'AP-000008',
  vendorId: '4',
  vendorName: 'AutoNation Wholesale',
  date: '2026-10-22',
  dueDate: '2026-11-21',
  amount: 25480,
  paid: 0,
  balance: 25480,
  daysOverdue: 4,
  agingBucket: '1-30',
  status: 'Overdue',
}

// Matches AP bill 11: partly paid and not yet due
export const partialPayable: Payable = {
  id: '11',
  number: 'AP-2026-000011',
  vendorId: '4',
  vendorName: 'AutoNation Wholesale',
  date: '2026-11-24',
  dueDate: '2026-12-24',
  amount: 52320,
  paid: 5000,
  balance: 47320,
  daysOverdue: 0,
  agingBucket: 'Current',
  status: 'Partial',
}

// Matches AP bill 12: nothing paid and not yet due
export const unpaidPayable: Payable = {
  id: '12',
  number: 'AP-2026-000012',
  vendorId: '1',
  vendorName: 'CarMax Auctions',
  date: '2026-11-25',
  dueDate: '2026-12-25',
  amount: 51620,
  paid: 0,
  balance: 51620,
  daysOverdue: 0,
  agingBucket: 'Current',
  status: 'Unpaid',
}

// Matches AP bill 2 under Status=paid: settled, though still 966 days past its due date
export const paidPayable: Payable = {
  id: '2',
  number: 'BILL-0018',
  vendorId: '1',
  vendorName: 'ABC Auto Auction',
  date: '2024-03-05',
  dueDate: '2024-04-04',
  amount: 84000,
  paid: 84000,
  balance: 0,
  daysOverdue: 966,
  agingBucket: 'Over 90',
  status: 'Paid',
}

// A row whose optional fields all came back empty
export const sparsePayable: Payable = {
  id: '',
  number: '',
  vendorId: '',
  vendorName: '',
  date: '',
  dueDate: '',
  amount: 0,
  paid: 0,
  balance: 0,
  daysOverdue: 0,
  agingBucket: 'Current',
  status: 'Unpaid',
}

export const payablePage: PayablePage = { items: [overduePayable, partialPayable], hasNext: true }

export const payableVendorOptions: PayableVendorOption[] = [
  { id: '4', name: 'AutoNation Wholesale' },
  { id: '1', name: 'CarMax Auctions' },
  { id: '3', name: 'Honda Auto Parts' },
]

// GetApById for AP bill 4, after mapping: stored as "Unpaid" but 943 days past due, so Overdue
export const overduePayableDetail: PayableDetail = {
  id: '4',
  number: 'BILL-0020',
  vendorId: '3',
  vendorName: 'Honda Auto Parts',
  vehicleId: '',
  date: '2024-03-12',
  dueDate: '2024-04-26',
  amount: 12400,
  paid: 0,
  balance: 12400,
  daysOverdue: 943,
  status: 'Overdue',
  contact: 'Sam Nguyen',
  phone: '(800) 555-0312',
  email: 'parts@honda.com',
  address: '700 Parts Ave, Columbus OH',
}

// GetApById for AP bill 11: a vehicle purchase, partly paid and not yet due
export const partialPayableDetail: PayableDetail = {
  id: '11',
  number: 'AP-2026-000011',
  vendorId: '1',
  vendorName: 'ABC Auto Auction',
  vehicleId: '1807',
  date: '2026-11-25',
  dueDate: '2026-11-30',
  amount: 52320,
  paid: 5000,
  balance: 47320,
  daysOverdue: 0,
  status: 'Partial',
  contact: 'Mark Reynolds',
  phone: '(800) 555-0101',
  email: 'sales@abcauto.com',
  address: '500 Auction Blvd, Dallas TX',
}

// A bill whose balance is settled
export const paidPayableDetail: PayableDetail = { ...partialPayableDetail, paid: 52320, balance: 0, status: 'Paid' }

// A GetApById response whose optional fields all came back empty
export const sparsePayableDetail: PayableDetail = {
  id: '',
  number: '',
  vendorId: '',
  vendorName: '',
  vehicleId: '',
  date: '',
  dueDate: '',
  amount: 0,
  paid: 0,
  balance: 0,
  daysOverdue: 0,
  status: 'Unpaid',
  contact: '',
  phone: '',
  email: '',
  address: '',
}

// GetPaymentHistory for AP bill 10, after mapping (in the API's order: oldest first)
export const payablePayments: PayablePayment[] = [
  { id: '8', paymentNumber: 'PAY-2026-000008', paymentDate: '2026-11-23', paymentMethod: 'card', reference: 'string', amount: 5000, status: 'Posted' },
  { id: '9', paymentNumber: 'PAY-2026-000009', paymentDate: '2026-11-25', paymentMethod: 'check', reference: 'string', amount: 500, status: 'Posted' },
]

// AP bill 11 as the Make Payment dialog receives it: partly paid
export const vendorPaymentTarget: VendorPaymentTarget = {
  id: '11',
  number: 'AP-2026-000011',
  vendorName: 'ABC Auto Auction',
  amount: 52320,
  paid: 5000,
  balance: 47320,
}

// A partial payment by check from account 1
export const vendorPaymentFormValues: VendorPaymentFormValues = {
  paymentDate: '2026-11-26',
  amount: '2000.50',
  paymentMethod: 'check',
  bankAccountId: '1',
  reference: ' CHK-1042 ',
}
