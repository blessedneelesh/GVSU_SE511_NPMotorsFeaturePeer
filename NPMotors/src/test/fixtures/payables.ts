import type { Payable, PayablePage, PayableVendorOption } from '../../types/payables'

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
