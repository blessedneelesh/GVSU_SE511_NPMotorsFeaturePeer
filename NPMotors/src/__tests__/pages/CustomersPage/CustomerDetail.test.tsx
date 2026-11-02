import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CustomerDetail } from '../../../pages/CustomersPage/CustomerDetail'
import { clearCustomerSelection, selectCustomer } from '../../../redux/customers/customers.actions'
import { customer, sparseCustomer } from '../../../test/fixtures/customers'
import { makeState, renderWithProviders } from '../../../test/test-utils'

describe('CustomerDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<CustomerDetail />, { preloadedState: makeState({ selectedId: 'C001', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading customer…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Customer')).toBeInTheDocument()
  })

  it('shows the error and retries the same customer', async () => {
    const { actions, user } = renderWithProviders(<CustomerDetail />, {
      preloadedState: makeState({ selectedId: 'C001', detailStatus: 'error', detailError: 'This customer no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load customer")).toBeInTheDocument()
    expect(screen.getByText('This customer no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([selectCustomer('C001')])
  })

  it('renders the profile, stats and the customer\'s invoices', () => {
    renderWithProviders(<CustomerDetail />, {
      preloadedState: makeState({ selectedId: 'C001', selected: customer, detailStatus: 'success' }),
    })

    expect(screen.getByRole('heading', { name: 'John Smith' })).toBeInTheDocument()
    expect(screen.getByText('john.smith@email.com')).toBeInTheDocument()
    expect(screen.getByText('1250 Motor Mile Drive, Dallas, TX 75201')).toBeInTheDocument()
    expect(screen.getByText('C001')).toBeInTheDocument()
    expect(screen.getByText('Active')).toHaveClass('badge-posted')
    expect(screen.getByText('$1,200')).toHaveClass('stat-value--amber')

    const invoices = screen.getByRole('table', { name: 'Sales invoices for John Smith' })
    expect(within(invoices).getByText('SI-2024-0001')).toBeInTheDocument()
    expect(within(invoices).queryByText('No invoices found')).not.toBeInTheDocument()
  })

  it('highlights an unpaid invoice balance', () => {
    // C007 has an overdue sample invoice with an outstanding balance
    renderWithProviders(<CustomerDetail />, {
      preloadedState: makeState({ selectedId: 'C007', selected: { ...customer, id: 'C007' }, detailStatus: 'success' }),
    })
    const invoices = screen.getByRole('table', { name: 'Sales invoices for John Smith' })
    expect(within(invoices).getByText('Overdue')).toHaveClass('badge-overdue')
    expect(within(invoices).getAllByText('$18,400')[1]).toHaveClass('text-amber')
  })

  it('falls back for missing fields and shows the empty invoices row', () => {
    renderWithProviders(<CustomerDetail />, {
      preloadedState: makeState({ selectedId: 'X', selected: sparseCustomer, detailStatus: 'success' }),
    })

    // Address and customer ID both fall back to '—'
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.getByText('Inactive')).toHaveClass('badge-cancelled')
    expect(screen.getAllByText('$0')[1]).toHaveClass('stat-value--green')
    expect(within(screen.getByRole('table', { name: 'Sales invoices for Jane Doe' })).getByText('No invoices found')).toBeInTheDocument()
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderWithProviders(<CustomerDetail />, {
      preloadedState: makeState({ selectedId: 'C001', selected: customer, detailStatus: 'success' }),
    })
    await user.click(screen.getByRole('button', { name: '← Customers' }))
    expect(actions).toEqual([clearCustomerSelection()])
  })
})
