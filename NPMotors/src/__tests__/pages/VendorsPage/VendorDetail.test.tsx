import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VendorDetail } from '../../../pages/VendorsPage/VendorDetail'
import { clearVendorSelection, selectVendor } from '../../../redux/vendors/vendors.actions'
import { sparseVendor, vendor } from '../../../test/fixtures/vendors'
import { makeVendorState, renderWithProviders } from '../../../test/test-utils'

describe('VendorDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<VendorDetail />, { preloadedState: makeVendorState({ selectedId: '5', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading vendor…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Vendor')).toBeInTheDocument()
  })

  it('shows the error and retries the same vendor', async () => {
    const { actions, user } = renderWithProviders(<VendorDetail />, {
      preloadedState: makeVendorState({ selectedId: '5', detailStatus: 'error', detailError: 'This vendor no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load vendor")).toBeInTheDocument()
    expect(screen.getByText('This vendor no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([selectVendor('5')])
  })

  it('renders the profile and the stats', () => {
    renderWithProviders(<VendorDetail />, {
      preloadedState: makeVendorState({ selectedId: '5', selected: vendor, detailStatus: 'success' }),
    })

    expect(screen.getByRole('heading', { name: 'Detroit Dealer Exchange' })).toBeInTheDocument()
    expect(screen.getByText('Contact: Omar Haddad')).toBeInTheDocument()
    expect(screen.getByText('313-555-0205 · trade@detroitdealerx.example')).toBeInTheDocument()
    expect(screen.getByText('1800 Fort St, Detroit, MI 48216')).toBeInTheDocument()
    expect(screen.getByText('Vehicle')).toHaveClass('badge')
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('5')).toHaveClass('mono')
    expect(screen.getByText('$28,000')).toHaveClass('stat-value--blue')
    expect(screen.getByText('$3,500')).toHaveClass('stat-value--red')
  })

  it('falls back for missing fields and shows a zero payable in green', () => {
    renderWithProviders(<VendorDetail />, {
      preloadedState: makeVendorState({ selectedId: 'X', selected: sparseVendor, detailStatus: 'success' }),
    })

    expect(screen.getByText('Contact: —')).toBeInTheDocument()
    // The phone · email line, the address and the vendor ID all fall back to '—'
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(screen.getByText('Parts')).toHaveClass('badge')
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getAllByText('$0')[1]).toHaveClass('stat-value--green')
  })

  it('shows only the parts of the contact line that exist', () => {
    renderWithProviders(<VendorDetail />, {
      preloadedState: makeVendorState({ selectedId: '5', selected: { ...vendor, phone: '' }, detailStatus: 'success' }),
    })
    expect(screen.getByText('trade@detroitdealerx.example')).toBeInTheDocument()
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderWithProviders(<VendorDetail />, {
      preloadedState: makeVendorState({ selectedId: '5', selected: vendor, detailStatus: 'success' }),
    })
    await user.click(screen.getByRole('button', { name: '← Vendors' }))
    expect(actions).toEqual([clearVendorSelection()])
  })
})
