import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Dropdown,
  Link,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Option,
  SearchBox,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components'
import { Add20Regular } from '@fluentui/react-icons'
import { useEmployeeDetail } from '../../hooks/useEmployeeDetail'
import { useEmployeeMutations } from '../../hooks/useEmployeeMutations'
import { useEmployees } from '../../hooks/useEmployees'
import type { Employee, EmployeeDepartmentFilter, EmployeeStatusFilter } from '../../types/employees'
import { EmployeeDetail } from './EmployeeDetail'
import { EmployeeFormDialog } from './EmployeeFormDialog'
import { EMPLOYEE_DEPARTMENTS, getEmployeeInitials } from './employeeMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './EmployeesPage.css'

const pageSizeOptions = [5, 10, 25, 50]

const SAVED_BANNER_MS = 4000

const departmentOptions: { value: EmployeeDepartmentFilter; label: string }[] = [
  { value: 'all', label: 'All Departments' },
  ...EMPLOYEE_DEPARTMENTS.map((department) => ({ value: department, label: department })),
]

const statusOptions: { value: EmployeeStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const isDepartmentFilter = (value: unknown): value is EmployeeDepartmentFilter =>
  departmentOptions.some((option) => option.value === value)

const isStatusFilter = (value: unknown): value is EmployeeStatusFilter =>
  statusOptions.some((option) => option.value === value)

function exportEmployees(rows: Employee[]) {
  const header = ['ID', 'First Name', 'Last Name', 'Department', 'Job Title', 'Salary', 'Bonus', 'Commission Rate', 'Salesperson', 'Status']
  const lines = [header, ...rows.map((e) => [e.id, e.firstName, e.lastName, e.department, e.job, String(e.salary), String(e.bonus), String(e.commissionRate), e.isSalesperson ? 'Yes' : 'No', e.status])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'employees.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function EmployeesPage() {
  const {
    employees,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setDepartmentFilter,
    setStatusFilter,
    setPage,
    setPageSize,
    retry,
  } = useEmployees()
  const { selectedId, openEmployee } = useEmployeeDetail()
  const { saveStatus, resetSave } = useEmployeeMutations()
  const [isAddOpen, setAddOpen] = useState(false)

  const openAdd = () => {
    resetSave()
    setAddOpen(true)
  }
  const closeAdd = useCallback(() => {
    resetSave()
    setAddOpen(false)
  }, [resetSave])

  // A successful save swaps the dialog for the success banner, which hides itself after a few seconds
  const isSaved = isAddOpen && saveStatus === 'success'
  useEffect(() => {
    if (!isSaved) return
    const timer = window.setTimeout(closeAdd, SAVED_BANNER_MS)
    return () => window.clearTimeout(timer)
  }, [isSaved, closeAdd])

  // The list hook stays mounted while the detail view is open, so its query and page are kept
  if (selectedId) return <EmployeeDetail />

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && employees.length === 0
  const hasActiveFilters = query.searchTerm !== '' || query.department !== 'all' || query.status !== 'all'
  const departmentLabel = departmentOptions.find((option) => option.value === query.department)?.label ?? 'All Departments'
  const statusLabel = statusOptions.find((option) => option.value === query.status)?.label ?? 'All Status'
  const showTable = !isInitialLoad && listStatus !== 'error'

  return (
    <div className="employees-page">
      <header className="employees-header">
        <div>
          <h1>Employees</h1>
          <p>{employees.length} {employees.length === 1 ? 'employee' : 'employees'} on this page</p>
        </div>
        <div className="employees-header__actions">
          <Button appearance="primary" icon={<Add20Regular />} onClick={openAdd}>Add Employee</Button>
          <Button disabled={employees.length === 0} onClick={() => exportEmployees(employees)}>Export</Button>
        </div>
      </header>

      {isAddOpen && !isSaved && <EmployeeFormDialog onClose={closeAdd} />}

      {isSaved && (
        <MessageBar intent="success" className="employees-message">
          <MessageBarBody>Employee added successfully.</MessageBarBody>
          <MessageBarActions>
            <Button appearance="transparent" size="small" onClick={closeAdd}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <div className="employees-filters">
        <SearchBox
          className="employees-filters__search"
          aria-label="Search employees"
          placeholder="Search employees…"
          value={searchInput}
          onChange={(_, data) => setSearchInput(data.value)}
        />
        <Dropdown
          className="employees-filters__department"
          aria-label="Filter employees by department"
          value={departmentLabel}
          selectedOptions={[query.department]}
          onOptionSelect={(_, data) => { if (isDepartmentFilter(data.optionValue)) setDepartmentFilter(data.optionValue) }}
        >
          {departmentOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
        <Dropdown
          className="employees-filters__status"
          aria-label="Filter employees by status"
          value={statusLabel}
          selectedOptions={[query.status]}
          onOptionSelect={(_, data) => { if (isStatusFilter(data.optionValue)) setStatusFilter(data.optionValue) }}
        >
          {statusOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
      </div>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="employees-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load employees</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card employees-loading">
          <Spinner label="Loading employees…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Employees" aria-busy={isLoading} className="data-table employees-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Department</TableHeaderCell>
                  <TableHeaderCell>Job title</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Employee ID</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id || employee.fullName}>
                    <TableCell>
                      <div className="employee-cell">
                        <div className="employee-avatar" aria-hidden="true">{getEmployeeInitials(employee)}</div>
                        <Link as="button" className="employee-cell__name" disabled={!employee.id} onClick={() => openEmployee(employee.id)}>
                          {employee.fullName}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-secondary">{employee.department || '—'}</TableCell>
                    <TableCell className="text-secondary">{employee.job || '—'}</TableCell>
                    <TableCell>
                      <span className={`badge ${employee.status === 'Active' ? 'badge-posted' : 'badge-cancelled'}`}>{employee.status}</span>
                    </TableCell>
                    <TableCell className="mono text-xs text-muted">{employee.id || '—'}</TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more employees on this page.'
                        : <>No employees found.{hasActiveFilters && ' Try clearing the search or filters.'}</>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={employees.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="employees"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}
    </div>
  )
}
