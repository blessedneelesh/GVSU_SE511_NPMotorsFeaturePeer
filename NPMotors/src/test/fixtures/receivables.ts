import type { Receivable, ReceivableCustomerOption, ReceivablePage } from '../../types/receivables'

// Matches AR invoice 2 of the running API's sample data, after mapping: unpaid and long overdue
export const overdueReceivable: Receivable = {
  id: '2',
  number: 'SI-0005',
  customerId: '7',
  customerName: 'David Taylor',
  invoiceNumber: 'SI-0005',
  dueDate: '2024-03-22',
  amount: 18400,
  paid: 0,
  balance: 18400,
  daysOverdue: 967,
  agingStatus: 'Overdue',
}

// Matches AR invoice 2471: partly paid and overdue by under 30 days
export const recentOverdueReceivable: Receivable = {
  id: '2471',
  number: 'AR-002471',
  customerId: '6',
  customerName: 'Jennifer Brown',
  invoiceNumber: 'INV-004262',
  dueDate: '2026-11-08',
  amount: 29350,
  paid: 1850,
  balance: 27500,
  daysOverdue: 6,
  agingStatus: 'Overdue',
}

// Matches AR invoice 3975: partly paid and not yet due
export const partialReceivable: Receivable = {
  id: '3975',
  number: 'AR-003975',
  customerId: '8',
  customerName: 'Lisa Anderson',
  invoiceNumber: 'INV-006249',
  dueDate: '2026-12-13',
  amount: 19890,
  paid: 1200,
  balance: 18690,
  daysOverdue: 0,
  agingStatus: 'Partial',
}

// Matches AR invoice 3974: nothing paid and not yet due
export const unpaidReceivable: Receivable = {
  id: '3974',
  number: 'AR-003974',
  customerId: '3',
  customerName: 'Michael Davis',
  invoiceNumber: 'INV-006244',
  dueDate: '2026-12-13',
  amount: 19890,
  paid: 0,
  balance: 19890,
  daysOverdue: 0,
  agingStatus: 'Unpaid',
}

// Matches AR invoice 4 under Status=paid: settled, though still 934 days past its due date
export const paidReceivable: Receivable = {
  id: '4',
  number: 'SI-0009',
  customerId: '1',
  customerName: 'John Smith',
  invoiceNumber: 'SI-0009',
  dueDate: '2024-04-24',
  amount: 58742,
  paid: 58742,
  balance: 0,
  daysOverdue: 934,
  agingStatus: 'Paid',
}

// A row whose optional fields all came back empty
export const sparseReceivable: Receivable = {
  id: '',
  number: '',
  customerId: '',
  customerName: '',
  invoiceNumber: '',
  dueDate: '',
  amount: 0,
  paid: 0,
  balance: 0,
  daysOverdue: 0,
  agingStatus: 'Unpaid',
}

export const receivablePage: ReceivablePage = { items: [overdueReceivable, partialReceivable], hasNext: true }

export const receivableCustomerOptions: ReceivableCustomerOption[] = [
  { id: '7', name: 'David Taylor' },
  { id: '6', name: 'Jennifer Brown' },
  { id: '1', name: 'John Smith' },
]
