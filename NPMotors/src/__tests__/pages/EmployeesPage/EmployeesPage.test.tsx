import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmployeesPage } from '../../../pages/EmployeesPage/EmployeesPage'
import {
  createEmployeeSuccess,
  loadEmployees,
  loadEmployeesFailure,
  loadEmployeesSuccess,
  resetEmployeeSave,
  selectEmployee,
  setEmployeeDepartmentFilter,
  setEmployeePage,
  setEmployeeSearch,
  setEmployeeStatusFilter,
} from '../../../redux/employees/employees.actions'
import type { EmployeesState } from '../../../redux/employees/employees.reducer'
import { employee, sparseEmployee } from '../../../test/fixtures/employees'
import { makeEmployeeState, renderWithProviders } from '../../../test/test-utils'
import type { Employee } from '../../../types/employees'

// The page dispatches loadEmployees() on mount, which sets listStatus to 'loading'. Without a saga nothing
// answers it, so each test dispatches the response itself, just as the saga would.
function renderLoaded(items: Employee[], overrides: Partial<EmployeesState> = {}, hasNext = false) {
  const result = renderWithProviders(<EmployeesPage />, { preloadedState: makeEmployeeState(overrides) })
  act(() => { result.store.dispatch(loadEmployeesSuccess({ items, hasNext })) })
  return result
}

const noFilters = { pageNumber: 1, pageSize: 5, department: 'all', status: 'all', searchTerm: '' } as const

afterEach(() => {
  vi.useRealTimers()
})

describe('EmployeesPage', () => {
  it('loads employees on mount and shows a spinner instead of the table', () => {
    const { actions } = renderWithProviders(<EmployeesPage />)
    expect(actions).toContainEqual(loadEmployees())
    expect(screen.getByText('Loading employees…')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Employees' })).not.toBeInTheDocument()
  })

  it('renders a row per employee with the count, avatars, badges and fallbacks', () => {
    renderLoaded([employee, sparseEmployee])

    expect(screen.getByRole('heading', { name: 'Employees' })).toBeInTheDocument()
    expect(screen.getByText('2 employees on this page')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Employees' })
    // header row + 2 employees
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('ML')).toHaveClass('employee-avatar')
    expect(within(table).getByText('SR')).toHaveClass('employee-avatar')
    expect(within(table).getByText('Sales')).toBeInTheDocument()
    expect(within(table).getByText('Sales Representative')).toBeInTheDocument()
    expect(within(table).getByText('12')).toHaveClass('mono')
    expect(within(table).getByText('Active')).toHaveClass('badge-posted')
    expect(within(table).getByText('Inactive')).toHaveClass('badge-cancelled')
    // sparseEmployee has no department, job title or id
    expect(within(table).getAllByText('—')).toHaveLength(3)
  })

  it('uses the singular for a single employee', () => {
    renderLoaded([employee])
    expect(screen.getByText('1 employee on this page')).toBeInTheDocument()
  })

  it('shows the empty state on page 1 without filters', () => {
    renderLoaded([])
    expect(screen.getByText('No employees found.')).toBeInTheDocument()
    expect(screen.queryByText(/Try clearing/)).not.toBeInTheDocument()
  })

  it.each([
    ['department', { department: 'Sales' }, 'Filter employees by department', 'Sales'],
    ['status', { status: 'inactive' }, 'Filter employees by status', 'Inactive'],
    ['search', { searchTerm: 'lopez' }, 'Filter employees by department', 'All Departments'],
  ] as const)('adds the clear-filters hint when the %s filter is active', (_, filter, dropdown, label) => {
    renderLoaded([], { query: { ...noFilters, ...filter } })
    expect(screen.getByText('No employees found. Try clearing the search or filters.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: dropdown })).toHaveTextContent(label)
  })

  it('shows a different empty message past page 1', () => {
    renderLoaded([], { query: { ...noFilters, pageNumber: 2 } })
    expect(screen.getByText('No more employees on this page.')).toBeInTheDocument()
  })

  it('shows the error banner, hides the table and retries', async () => {
    const { store, actions, user } = renderWithProviders(<EmployeesPage />)
    act(() => { store.dispatch(loadEmployeesFailure('The server is not responding.')) })

    expect(screen.getByText("Couldn't load employees")).toBeInTheDocument()
    expect(screen.getByText('The server is not responding.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Employees' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === loadEmployees().type)).toHaveLength(2)
  })

  it('dispatches the search term after the debounce delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { actions } = renderLoaded([employee])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.type(screen.getByRole('searchbox', { name: 'Search employees' }), '  lopez ')
    expect(actions).not.toContainEqual(setEmployeeSearch('lopez'))

    act(() => { vi.advanceTimersByTime(300) })
    expect(actions).toContainEqual(setEmployeeSearch('lopez'))
  })

  it('offers the design departments and dispatches the chosen one', async () => {
    const { actions, user } = renderLoaded([employee])
    await user.click(screen.getByRole('combobox', { name: 'Filter employees by department' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent))
      .toEqual(['All Departments', 'Accounting', 'Administration', 'Management', 'Sales', 'Service'])
    await user.click(screen.getByRole('option', { name: 'Service' }))
    expect(actions).toContainEqual(setEmployeeDepartmentFilter('Service'))
  })

  it('offers the statuses and dispatches the chosen one', async () => {
    const { actions, user } = renderLoaded([employee])
    await user.click(screen.getByRole('combobox', { name: 'Filter employees by status' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['All Status', 'Active', 'Inactive'])
    await user.click(screen.getByRole('option', { name: 'Inactive' }))
    expect(actions).toContainEqual(setEmployeeStatusFilter('inactive'))
  })

  it('dispatches the next page from the pagination', async () => {
    const { actions, user } = renderLoaded([employee], {}, true)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(actions).toContainEqual(setEmployeePage(2))
  })

  it('disables the name link when an employee has no id', () => {
    renderLoaded([employee, sparseEmployee])
    expect(screen.getByRole('button', { name: 'Sam Reed' })).toBeDisabled()
  })

  it('opens an employee from its name', async () => {
    const { actions, user } = renderLoaded([employee, sparseEmployee])
    await user.click(screen.getByRole('button', { name: 'Maria Lopez' }))
    expect(actions).toContainEqual(selectEmployee('12'))
    expect(screen.getByText('Loading employee…')).toBeInTheDocument()
  })

  it('renders the detail view instead of the list when an employee is selected', () => {
    renderWithProviders(<EmployeesPage />, { preloadedState: makeEmployeeState({ selectedId: '12', detailStatus: 'loading' }) })
    expect(screen.getByText('Loading employee…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Employees' })).not.toBeInTheDocument()
  })

  describe('Add Employee', () => {
    it('resets the save state and opens the dialog', async () => {
      const { actions, user } = renderLoaded([employee])
      await user.click(screen.getByRole('button', { name: 'Add Employee' }))

      expect(actions).toContainEqual(resetEmployeeSave())
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create a new NPMotors employee record')).toBeInTheDocument()
    })

    it('closes the dialog on Cancel', async () => {
      const { user } = renderLoaded([employee])
      await user.click(screen.getByRole('button', { name: 'Add Employee' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('swaps the dialog for the success banner, which hides itself after 4 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { store } = renderLoaded([employee])
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(screen.getByRole('button', { name: 'Add Employee' }))

      act(() => { store.dispatch(createEmployeeSuccess()) })
      expect(screen.getByText('Employee added successfully.')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByText('Employee added successfully.')).not.toBeInTheDocument()
      expect(store.getState().employees.saveStatus).toBe('idle')
    })

    it('dismisses the success banner', async () => {
      const { store, user } = renderLoaded([employee])
      await user.click(screen.getByRole('button', { name: 'Add Employee' }))
      act(() => { store.dispatch(createEmployeeSuccess()) })

      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText('Employee added successfully.')).not.toBeInTheDocument()
    })
  })

  describe('Export', () => {
    it('is disabled when there are no rows', () => {
      renderLoaded([])
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    })

    it('downloads the current rows as CSV', async () => {
      // jsdom has no object URLs and can't follow the download link, so stub both
      const createObjectURL = vi.fn((blob: Blob) => (blob ? 'blob:employees' : ''))
      const revokeObjectURL = vi.fn()
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const { user } = renderLoaded([employee, sparseEmployee])

      await user.click(screen.getByRole('button', { name: 'Export' }))

      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:employees')
      const blob = createObjectURL.mock.calls[0]?.[0]
      expect(blob?.type).toBe('text/csv')
      const csv = await blob?.text()
      expect(csv?.split('\n')).toEqual([
        '"ID","First Name","Last Name","Department","Job Title","Salary","Bonus","Commission Rate","Salesperson","Status"',
        '"12","Maria","Lopez","Sales","Sales Representative","52000","1500","2.5","Yes","Active"',
        '"","Sam","Reed","","","0","0","0","No","Inactive"',
      ])
    })
  })
})
