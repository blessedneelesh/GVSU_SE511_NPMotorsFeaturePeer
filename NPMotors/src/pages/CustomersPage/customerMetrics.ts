import type { Customer } from '../../types/customers'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const formatCurrency = (amount: number) => currency.format(amount)

export const getInitials = (customer: Customer) =>
  `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase() || '?'
