// Whole dollars, as Customers ("$1,540"), for stock values and receipt totals
export { formatCurrency } from '../CustomersPage/customerMetrics'

const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

// The design shows unit cost and sell price with cents ("$38.50")
export const formatPrice = (amount: number) => price.format(amount)

// The categories the existing parts use. The API stores category as free text, so the filter offers this fixed list.
export const PART_CATEGORIES = ['Accessories', 'Brakes', 'Electrical', 'Engine', 'Filters', 'Tires', 'Wheels'] as const

export const stockLabel = (isLowStock: boolean) => (isLowStock ? 'Low Stock' : 'In Stock')

// Badge colours from the design: Low Stock red, In Stock green
export const stockBadge = (isLowStock: boolean) => (isLowStock ? 'badge-overdue' : 'badge-posted')
