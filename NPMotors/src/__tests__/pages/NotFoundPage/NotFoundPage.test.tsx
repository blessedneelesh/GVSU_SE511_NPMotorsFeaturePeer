import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NotFoundPage } from '../../../pages/NotFoundPage/NotFoundPage'
import { renderWithProviders } from '../../../test/test-utils'

describe('NotFoundPage', () => {
  it('matches the snapshot', () => {
    const { container } = renderWithProviders(<NotFoundPage />)
    expect(container).toMatchSnapshot()
  })

  it('explains that the page does not exist', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByText('The page you requested does not exist.')).toBeInTheDocument()
  })

  it('returns to the dashboard', async () => {
    const { user } = renderWithProviders(
      <Routes>
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/dashboard" element={<p>Dashboard route</p>} />
      </Routes>,
      { route: '/missing' },
    )
    const link = screen.getByRole('link', { name: 'Return to dashboard' })
    expect(link).toHaveAttribute('href', '/dashboard')

    await user.click(link)
    expect(screen.getByText('Dashboard route')).toBeInTheDocument()
  })
})
