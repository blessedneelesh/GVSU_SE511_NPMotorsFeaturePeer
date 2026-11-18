import { describe, expect, it, vi } from 'vitest'
import { customerClient } from '../../../services/api/customerClient'
import { salesInvoicesApi } from '../../../services/salesInvoices/salesInvoices.api'
import { mapCustomerSalesInvoice, mapCustomerSalesInvoiceCollection } from '../../../services/salesInvoices/salesInvoices.mappers'

// What GET SalesInvoice/GetSalesInvoiceByCustomer?customerId=3 returns
const body = {
  items: [
    { invoice_Number: 'INV-006244', invoice_Date: '2026-11-13T00:00:00', vehicle: 'Honda Civic', salesperson: 'Angela Torres', amount: 19890.0, paid: 2168.0, payment_Status: 'partial' },
    { invoice_Number: 'SI-0002', invoice_Date: '2024-03-08T00:00:00', vehicle: '2024 Honda Civic', salesperson: 'Angela Torres', amount: 29758.0, paid: 29758.0, payment_Status: 'Paid' },
  ],
}

describe('customer sales invoice mapper', () => {
  it('maps each row, working out the balance and reading the status in either case', () => {
    expect(mapCustomerSalesInvoiceCollection(body)).toEqual([
      { number: 'INV-006244', invoiceDate: '2026-11-13', vehicle: 'Honda Civic', salesperson: 'Angela Torres', amount: 19890, paid: 2168, balance: 17722, paymentStatus: 'partial' },
      { number: 'SI-0002', invoiceDate: '2024-03-08', vehicle: '2024 Honda Civic', salesperson: 'Angela Torres', amount: 29758, paid: 29758, balance: 0, paymentStatus: 'paid' },
    ])
  })

  it('falls back for missing fields, never shows a negative or fractional-cent balance, and keeps an unknown status empty', () => {
    expect(mapCustomerSalesInvoice({})).toEqual({
      number: '', invoiceDate: '', vehicle: '', salesperson: '', amount: 0, paid: 0, balance: 0, paymentStatus: null,
    })
    expect(mapCustomerSalesInvoice({ amount: 100, paid: 120, payment_Status: 'refunded' })).toMatchObject({ balance: 0, paymentStatus: null })
    expect(mapCustomerSalesInvoice({ amount: 0.3, paid: 0.1 }).balance).toBe(0.2)
  })

  it('builds the vehicle from make and model when no name is sent, and accepts a bare array', () => {
    expect(mapCustomerSalesInvoiceCollection([{ make: 'Ram', model: '1500', total: 5 }, 'junk'])).toEqual([
      expect.objectContaining({ vehicle: 'Ram 1500', amount: 5 }),
    ])
    expect(mapCustomerSalesInvoiceCollection(null)).toEqual([])
  })
})

describe('salesInvoicesApi.getSalesInvoicesByCustomer', () => {
  it('sends the customer id as a query parameter and maps the answer', async () => {
    const get = vi.spyOn(customerClient, 'get').mockResolvedValue({ data: body })
    const signal = new AbortController().signal

    const invoices = await salesInvoicesApi.getSalesInvoicesByCustomer('3', signal)

    expect(get).toHaveBeenCalledWith('SalesInvoice/GetSalesInvoiceByCustomer', { params: { customerId: '3' }, signal })
    expect(invoices.map((invoice) => invoice.number)).toEqual(['INV-006244', 'SI-0002'])
    get.mockRestore()
  })
})
