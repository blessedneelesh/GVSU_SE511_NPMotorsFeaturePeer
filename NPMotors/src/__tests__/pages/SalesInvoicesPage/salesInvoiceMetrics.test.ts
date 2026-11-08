import { describe, expect, it } from 'vitest'
import { formatCurrency as customerFormatCurrency } from '../../../pages/CustomersPage/customerMetrics'
import { formatPrice } from '../../../pages/PartsPage/partMetrics'
import {
  addDaysIso,
  canCancel,
  computeTotals,
  DOCUMENT_FEES,
  formatAmount,
  formatCurrency,
  shortVin,
  statusBadges,
  statusTitle,
  TAX_RATE,
  todayIso,
} from '../../../pages/SalesInvoicesPage/salesInvoiceMetrics'
import { cancelledInvoice, draftInvoice, partialInvoice, postedInvoice, sparseInvoice } from '../../../test/fixtures/salesInvoices'

describe('salesInvoiceMetrics', () => {
  it('reuses the Customers whole-dollar and the Parts cents formats', () => {
    expect(formatCurrency).toBe(customerFormatCurrency)
    expect(formatAmount).toBe(formatPrice)
    expect(formatCurrency(33120)).toBe('$33,120')
    expect(formatAmount(33120)).toBe('$33,120.00')
  })

  it('charges 8% tax and $450 fees, as the design does', () => {
    expect(TAX_RATE).toBe(0.08)
    expect(DOCUMENT_FEES).toBe(450)
  })

  describe('computeTotals', () => {
    it('adds tax and fees to the sale price', () => {
      expect(computeTotals(30250, 0)).toEqual({ subtotal: 30250, tax: 2420, fees: 450, total: 33120 })
    })

    it('takes the discount off the subtotal and the total but taxes the full sale price', () => {
      expect(computeTotals(44500, 500)).toEqual({ subtotal: 44000, tax: 3560, fees: 450, total: 48010 })
    })

    it('rounds the tax to cents', () => {
      expect(computeTotals(999.99, 0).tax).toBe(80)
      expect(computeTotals(12345.67, 0).tax).toBe(987.65)
    })

    it('still charges the fees with no vehicle selected', () => {
      expect(computeTotals(0, 0)).toEqual({ subtotal: 0, tax: 0, fees: 450, total: 450 })
    })
  })

  describe('canCancel', () => {
    it.each([
      ['a posted invoice with nothing paid', postedInvoice, true],
      ['a partly paid invoice', partialInvoice, false],
      ['a draft', draftInvoice, false],
      ['a cancelled invoice', cancelledInvoice, false],
    ])('is %s → %s', (_, invoice, expected) => {
      expect(canCancel(invoice)).toBe(expected)
    })
  })

  describe('statusBadges and statusTitle', () => {
    it.each([
      ['draft', draftInvoice, [{ label: 'Draft', className: 'badge-draft' }], 'Draft'],
      ['cancelled', cancelledInvoice, [{ label: 'Cancelled', className: 'badge-cancelled' }], 'Cancelled'],
      ['unpaid', postedInvoice, [{ label: 'Posted', className: 'badge-approved' }, { label: 'Unpaid', className: 'badge-unpaid' }], 'Posted · Unpaid'],
      ['partial', partialInvoice, [{ label: 'Posted', className: 'badge-approved' }, { label: 'Partial', className: 'badge-partial' }], 'Posted · Partial'],
      ['paid', sparseInvoice, [{ label: 'Posted', className: 'badge-approved' }, { label: 'Paid', className: 'badge-paid' }], 'Posted · Paid'],
      ['posted without a payment status', { ...postedInvoice, paymentStatus: null }, [{ label: 'Posted', className: 'badge-approved' }], 'Posted'],
    ])('labels a %s invoice', (_, invoice, badges, title) => {
      expect(statusBadges(invoice)).toEqual(badges)
      expect(statusTitle(invoice)).toBe(title)
    })
  })

  it('shows the last 10 VIN characters', () => {
    expect(shortVin('4T1G11AK0RU000024')).toBe('K0RU000024')
    expect(shortVin('SHORT')).toBe('SHORT')
  })

  describe('dates', () => {
    it('formats today as a local YYYY-MM-DD', () => {
      const now = new Date()
      const pad = (value: number) => String(value).padStart(2, '0')
      expect(todayIso()).toBe(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
    })

    it('adds days across month and year ends', () => {
      expect(addDaysIso(30, new Date(2026, 10, 4))).toBe('2026-12-04')
      expect(addDaysIso(30, new Date(2026, 11, 15))).toBe('2027-01-14')
      expect(addDaysIso(1, new Date(2028, 1, 28))).toBe('2028-02-29')
    })
  })
})
