import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmployeeDetail } from '../../../pages/EmployeesPage/EmployeeDetail'
import { clearEmployeeSelection, selectEmployee } from '../../../redux/employees/employees.actions'
import { employee, sparseEmployee } from '../../../test/fixtures/employees'
import { makeEmployeeState, renderWithProviders } from '../../../test/test-utils'

describe('EmployeeDetail', () => {
  it('shows a spinner and a placeholder title while loading', () => {
    renderWithProviders(<EmployeeDetail />, { preloadedState: makeEmployeeState({ selectedId: '12', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading employee…')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Employee')).toBeInTheDocument()
  })

  it('shows the error and retries the same employee', async () => {
    const { actions, user } = renderWithProviders(<EmployeeDetail />, {
      preloadedState: makeEmployeeState({ selectedId: '12', detailStatus: 'error', detailError: 'This employee no longer exists.' }),
    })

    expect(screen.getByText("Couldn't load employee")).toBeInTheDocument()
    expect(screen.getByText('This employee no longer exists.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions).toEqual([selectEmployee('12')])
  })

  it('renders the profile, the badges and the pay stats', () => {
    renderWithProviders(<EmployeeDetail />, {
      preloadedState: makeEmployeeState({ selectedId: '12', selected: employee, detailStatus: 'success' }),
    })

    expect(screen.getByRole('heading', { name: 'Maria Lopez' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Maria Lopez')).toBeInTheDocument()
    expect(screen.getByText('ML')).toHaveClass('employee-avatar--large')
    expect(screen.getByText('Sales Representative')).toBeInTheDocument()
    expect(screen.getByText('Sales')).toBeInTheDocument()
    expect(screen.getByText('Salesperson')).toHaveClass('badge-sales')
    expect(screen.getByText('Active')).toHaveClass('badge-posted')
    expect(screen.getByText('12')).toHaveClass('mono')
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('$52,000')).toHaveClass('stat-value--blue')
    expect(screen.getByText('$1,500')).toHaveClass('stat-value')
    expect(screen.getByText('2.5%')).toHaveClass('stat-value')
  })

  it('falls back for missing fields and hides the Salesperson badge', () => {
    renderWithProviders(<EmployeeDetail />, {
      preloadedState: makeEmployeeState({ selectedId: 'X', selected: sparseEmployee, detailStatus: 'success' }),
    })

    // The job, the department and the employee ID all fall back to '—'
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(screen.queryByText('Salesperson')).not.toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toHaveClass('badge-cancelled')
    // Salary and bonus
    expect(screen.getAllByText('$0')).toHaveLength(2)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('goes back to the list from the breadcrumb', async () => {
    const { actions, user } = renderWithProviders(<EmployeeDetail />, {
      preloadedState: makeEmployeeState({ selectedId: '12', selected: employee, detailStatus: 'success' }),
    })
    await user.click(screen.getByRole('button', { name: '← Employees' }))
    expect(actions).toEqual([clearEmployeeSelection()])
  })
})
