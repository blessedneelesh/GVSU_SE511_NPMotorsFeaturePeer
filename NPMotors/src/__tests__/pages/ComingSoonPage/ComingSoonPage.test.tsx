import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ComingSoonPage } from '../../../pages/ComingSoonPage/ComingSoonPage'
import { renderWithProviders } from '../../../test/test-utils'

describe('ComingSoonPage', () => {
  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<ComingSoonPage title="Vendors" />)
    expect(container).toMatchSnapshot()
  })

  it('shows the title prop in both headings', () => {
    renderWithProviders(<ComingSoonPage title="Vendors" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Vendors' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Vendors is coming soon' })).toBeInTheDocument()
  })

  it('links back to the dashboard', async () => {
    const { user } = renderWithProviders(
      <Routes>
        <Route path="/" element={<ComingSoonPage title="Vendors" />} />
        <Route path="/dashboard" element={<p>Dashboard route</p>} />
      </Routes>,
    )
    const link = screen.getByRole('link', { name: 'Back to dashboard' })
    expect(link).toHaveAttribute('href', '/dashboard')

    await user.click(link)
    expect(screen.getByText('Dashboard route')).toBeInTheDocument()
  })
})
