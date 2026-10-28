import type { SalesInvoice } from '../types/npmotors'

// total = sale price + 8% tax + $450 fees - discount; paid + balance = total
export const salesInvoices: SalesInvoice[] = [
  { id: 'INV001', number: 'SI-2024-0001', date: '2024-03-01', dueDate: '2024-03-31', customerId: 'C001', customerName: 'John Smith', salesperson: 'Marcus Webb', vehicle: '2023 Toyota Corolla', total: 28314, paid: 28314, balance: 0, status: 'Paid' },
  { id: 'INV002', number: 'SI-2024-0002', date: '2024-03-08', dueDate: '2024-04-07', customerId: 'C003', customerName: 'Michael Davis', salesperson: 'Angela Torres', vehicle: '2024 Honda Civic', total: 29758, paid: 29758, balance: 0, status: 'Paid' },
  { id: 'INV003', number: 'SI-2024-0003', date: '2024-03-15', dueDate: '2024-04-15', customerId: 'C005', customerName: 'Robert Martinez', salesperson: 'Marcus Webb', vehicle: '2024 Toyota Camry XSE', total: 43434, paid: 43434, balance: 0, status: 'Paid' },
  { id: 'INV004', number: 'SI-2024-0004', date: '2024-02-14', dueDate: '2024-03-15', customerId: 'C002', customerName: 'Sarah Johnson', salesperson: 'Angela Torres', vehicle: '2024 Toyota Avalon', total: 51182, paid: 51182, balance: 0, status: 'Paid' },
  { id: 'INV005', number: 'SI-2024-0005', date: '2024-02-20', dueDate: '2024-03-22', customerId: 'C007', customerName: 'David Taylor', salesperson: 'Marcus Webb', vehicle: '2022 Honda HR-V', total: 18400, paid: 0, balance: 18400, status: 'Overdue' },
  { id: 'INV006', number: 'SVC-2024-0042', date: '2024-03-10', dueDate: '2024-04-10', customerId: 'C006', customerName: 'Jennifer Brown', salesperson: 'Brandon Hayes', vehicle: 'Service — Brake & Oil', total: 1250, paid: 750, balance: 500, status: 'Partial' },
]
