import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PartDetail } from '../../../pages/PartsPage/PartDetail'
import { clearPartSelection, loadPartVendorOptions, loadPartVendorOptionsSuccess, selectPart } from '../../../redux/parts/parts.actions'
import { lowStockPart, part, partVendorOptions, sparsePart } from '../../../test/fixtures/parts'
import { makePartState, renderWithProviders } from '../../../test/test-utils'
import type { Part } from '../../../types/parts'

// The detail view loads the vendors on mount for the Vendor fact; without a saga the helper answers it
const renderProfile = (selected: Part, { vendors = true } = {}) => {
  const result = renderWithProviders(<PartDetail />, {
    preloadedState: makePartState({ selectedId: selected.id || 'X', selected, detailStatus: 'success' }),
  })
  if (vendors) act(() => { result.store.dispatch(loadPartVendorOptionsSuccess(partVendorOptions)) })
  return result
}

// Every fact and stat is a <dt>/<dd> pair; returns the <dd> for a label inside a container
const valueOf = (container: HTMLElement, label: string) => {
  const value = within(container).getByText(label, { selector: 'dt' }).nextElementSibling
  if (!(value instanceof HTMLElement)) throw new Error(`No value for ${label}`)
  return value
}

const sectionOf = (heading: string) => {
  const section = screen.getByRole('heading', { name: heading }).closest('section')
  if (!section) throw new Error(`No section for ${heading}`)
  return section
}

describe('PartDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<PartDetail />, { preloadedState: makePartState({ selectedId: '1', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading part…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Part')).toBeInTheDocument()
  })

  it('shows the error and retries the same part', async () => {
    const { actions, user } = renderWithProviders(<PartDetail />, {
      preloadedState: makePartState({ selectedId: '1', detailStatus: 'error', detailError: 'This part no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load part")).toBeInTheDocument()
    expect(screen.getByText('This part no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([loadPartVendorOptions(), selectPart('1')])
  })

  it('renders the hero card with the name, part number, status and the five stats', () => {
    renderProfile(part)

    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Front Brake Pad Set')).toBeInTheDocument()
    const card = sectionOf('Front Brake Pad Set')
    expect(within(card).getByText('BRK-1001')).toBeInTheDocument()
    expect(within(card).getByText('In Stock')).toHaveClass('badge-posted')
    expect(valueOf(card, 'Cost')).toHaveTextContent('$38.50')
    expect(valueOf(card, 'Sell Price')).toHaveTextContent('$69.99')
    expect(valueOf(card, 'Sell Price')).toHaveClass('text-green')
    expect(valueOf(card, 'Qty on Hand')).toHaveTextContent('40')
    expect(valueOf(card, 'Stock Value (Cost)')).toHaveTextContent('$1,540')
    expect(valueOf(card, 'Stock Value (Cost)')).toHaveClass('text-blue')
    // 40 × $69.99, in whole dollars
    expect(valueOf(card, 'Stock Value (Retail)')).toHaveTextContent('$2,800')
  })

  it('shows the part info and stock facts', () => {
    renderProfile(part)

    const panel = sectionOf('Part Info')
    expect(valueOf(panel, 'Part ID')).toHaveTextContent('1')
    expect(valueOf(panel, 'Part Number')).toHaveTextContent('BRK-1001')
    expect(valueOf(panel, 'Description')).toHaveTextContent('Front Brake Pad Set')
    expect(valueOf(panel, 'Category')).toHaveTextContent('Brakes')
    expect(valueOf(panel, 'Vendor')).toHaveTextContent('Great Lakes Auto Parts')
    expect(valueOf(panel, 'Warehouse')).toHaveTextContent('Warehouse A')
    expect(valueOf(panel, 'Quantity')).toHaveTextContent('40')
    expect(valueOf(panel, 'Quantity')).not.toHaveClass('text-red')
    expect(valueOf(panel, 'Reorder At')).toHaveTextContent('10')
    expect(valueOf(panel, 'Status')).toHaveTextContent('In Stock')
  })

  it('shows the vendor id until the vendors load', () => {
    renderProfile(part, { vendors: false })
    expect(valueOf(sectionOf('Part Info'), 'Vendor')).toHaveTextContent('Vendor #2')
  })

  it('flags a low-stock part in red', () => {
    renderProfile(lowStockPart)

    const card = sectionOf('Oil Filter')
    expect(within(card).getByText('Low Stock')).toHaveClass('badge-overdue')
    expect(valueOf(card, 'Qty on Hand')).toHaveClass('text-red')
    expect(valueOf(sectionOf('Part Info'), 'Quantity')).toHaveClass('text-red')
  })

  it('falls back for missing fields', () => {
    renderProfile(sparsePart)

    const card = sectionOf('Unnamed part')
    expect(within(card).getByText('—')).toBeInTheDocument()
    // Part ID, part number, description, category, vendor and warehouse
    expect(within(sectionOf('Part Info')).getAllByText('—')).toHaveLength(6)
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderProfile(part)
    await user.click(screen.getByRole('button', { name: '← Parts' }))
    expect(actions).toContainEqual(clearPartSelection())
  })
})
