import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DashboardPage } from '../../../pages/DashboardPage/DashboardPage'
import { renderWithProviders } from '../../../test/test-utils'

const renderWithRoutes = () => renderWithProviders(
  <Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/customers" element={<p>Customers route</p>} />
  </Routes>,
)

describe('DashboardPage', () => {
  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<DashboardPage />)
    expect(container).toMatchSnapshot()
  })

  it('renders the greeting and the six metrics', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Good morning, Alex' })).toBeInTheDocument()
    const metrics = screen.getByRole('region', { name: 'Dealership metrics' })
    expect(within(metrics).getAllByRole('article')).toHaveLength(6)
    expect(within(metrics).getByText('$2,846,500')).toBeInTheDocument()
    expect(within(metrics).getByText('-4.2%', { exact: false })).toHaveClass('metric-trend--negative')
  })

  it('lists the recent invoices and customers', () => {
    renderWithProviders(<DashboardPage />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByRole('button', { name: 'More actions for INV-1046' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recent customers' })).toBeInTheDocument()
    expect(screen.getByText('New customer')).toBeInTheDocument()
  })

  it('links to the customers page', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/customers')
    expect(screen.getByRole('link', { name: 'Manage customer relationships' })).toHaveAttribute('href', '/customers')
  })

  it('navigates to customers from Manage customer relationships', async () => {
    const { user } = renderWithRoutes()
    await user.click(screen.getByRole('link', { name: 'Manage customer relationships' }))
    expect(screen.getByText('Customers route')).toBeInTheDocument()
  })
})
