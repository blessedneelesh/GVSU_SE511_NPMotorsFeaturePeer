import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components'
import { useEmployeeDetail } from '../../hooks/useEmployeeDetail'
import type { Employee } from '../../types/employees'
import { formatCurrency, formatPercent, getEmployeeInitials } from './employeeMetrics'

// Loads the selected employee from GetEmployeeById via Redux; the list page decides when it's shown.
// The Figma design has no employee detail screen, so this follows the Customers/Vendors detail layout.
export function EmployeeDetail() {
  const { employee, detailStatus, detailError, closeEmployee, retry } = useEmployeeDetail()

  return (
    <div className="employees-page">
      <nav className="employees-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closeEmployee}>← Employees</button>
        <span aria-hidden="true">/</span>
        <strong>{employee?.fullName ?? 'Employee'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="employees-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load employee</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card employees-loading">
          <Spinner label="Loading employee…" />
        </section>
      )}

      {detailStatus === 'success' && employee && <EmployeeProfile employee={employee} />}
    </div>
  )
}

function EmployeeProfile({ employee }: { employee: Employee }) {
  return (
    <div className="employee-overview">
      <section className="card employee-profile">
        <div className="employee-profile__header">
          <div className="employee-avatar employee-avatar--large" aria-hidden="true">{getEmployeeInitials(employee)}</div>
          <div>
            <h1>{employee.fullName}</h1>
            <p>{employee.job || '—'}</p>
            <p>{employee.department || '—'}</p>
          </div>
          <div className="employee-profile__badges">
            {employee.isSalesperson && <span className="badge badge-sales">Salesperson</span>}
            <span className={`badge ${employee.status === 'Active' ? 'badge-posted' : 'badge-cancelled'}`}>{employee.status}</span>
          </div>
        </div>
        <dl className="employee-profile__facts">
          <div><dt>Employee ID:</dt> <dd className="mono">{employee.id || '—'}</dd></div>
          <div><dt>Salesperson:</dt> <dd>{employee.isSalesperson ? 'Yes' : 'No'}</dd></div>
        </dl>
      </section>
      <div className="employee-stats">
        <div className="stat-card">
          <div className="stat-label">Salary</div>
          <div className="stat-value stat-value--blue">{formatCurrency(employee.salary)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bonus</div>
          <div className="stat-value">{formatCurrency(employee.bonus)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Commission Rate</div>
          <div className="stat-value">{formatPercent(employee.commissionRate)}</div>
        </div>
      </div>
    </div>
  )
}
