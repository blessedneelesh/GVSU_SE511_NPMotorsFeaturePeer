import { useState } from 'react'
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
import { salesInvoices } from '../../data/sampleData'
import { useCustomers } from '../../hooks/useCustomers'
import type { Customer, CustomerStatusFilter } from '../../types/customers'
import { CustomerDetail } from './CustomerDetail'
import { formatCurrency, getInitials } from './customerMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './CustomersPage.css'

const pageSizeOptions = [5, 10, 25, 50]

const statusOptions: { value: CustomerStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const isStatusFilter = (value: unknown): value is CustomerStatusFilter =>
  statusOptions.some((option) => option.value === value)

function exportCustomers(rows: Customer[]) {
  const header = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 'Status', 'Total Purchases', 'Balance']
  const lines = [header, ...rows.map((c) => [c.id, c.firstName, c.lastName, c.email, c.phone, c.address, c.city, c.state, c.zip, c.status, String(c.totalPurchases), String(c.balance)])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'customers.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function CustomersPage() {
  const {
    customers,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setStatusFilter,
    setPage,
    setPageSize,
    retry,
  } = useCustomers()
  const [selected, setSelected] = useState<Customer | null>(null)

  if (selected) {
    return (
      <CustomerDetail
        customer={selected}
        invoices={salesInvoices.filter((invoice) => invoice.customerId === selected.id)}
        onBack={() => setSelected(null)}
      />
    )
  }

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && customers.length === 0
  const hasActiveFilters = query.searchTerm !== '' || query.status !== 'all'
  const statusLabel = statusOptions.find((option) => option.value === query.status)?.label ?? 'All'
  const showTable = !isInitialLoad && listStatus !== 'error'

  return (
    <div className="customers-page">
      <header className="customers-header">
        <div>
          <h1>Customers</h1>
          <p>{customers.length} {customers.length === 1 ? 'customer' : 'customers'} on this page</p>
        </div>
        <div className="customers-header__actions">
          <Button disabled={customers.length === 0} onClick={() => exportCustomers(customers)}>Export</Button>
        </div>
      </header>

      <div className="customers-filters">
        <SearchBox
          className="customers-filters__search"
          aria-label="Search customers"
          placeholder="Search by name, email or phone"
          value={searchInput}
          onChange={(_, data) => setSearchInput(data.value)}
        />
        <Dropdown
          className="customers-filters__status"
          aria-label="Filter by status"
          value={statusLabel}
          selectedOptions={[query.status]}
          onOptionSelect={(_, data) => { if (isStatusFilter(data.optionValue)) setStatusFilter(data.optionValue) }}
        >
          {statusOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
      </div>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="customers-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load customers</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card customers-loading">
          <Spinner label="Loading customers…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Customers" aria-busy={isLoading} className="customers-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Phone</TableHeaderCell>
                  <TableHeaderCell>City</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="num">Total purchases</TableHeaderCell>
                  <TableHeaderCell className="num">Balance</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id || customer.email}>
                    <TableCell>
                      <div className="customer-cell">
                        <div className="customer-avatar" aria-hidden="true">{getInitials(customer)}</div>
                        <Link as="button" className="customer-cell__name" onClick={() => setSelected(customer)}>
                          {customer.fullName}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-secondary">{customer.email || '—'}</TableCell>
                    <TableCell className="text-secondary">{customer.phone || '—'}</TableCell>
                    <TableCell className="text-secondary">{[customer.city, customer.state].filter(Boolean).join(', ') || '—'}</TableCell>
                    <TableCell>
                      <span className={`badge ${customer.status === 'Active' ? 'badge-posted' : 'badge-cancelled'}`}>{customer.status}</span>
                    </TableCell>
                    <TableCell className="num">{formatCurrency(customer.totalPurchases)}</TableCell>
                    <TableCell className={`num strong ${customer.balance > 0 ? 'text-amber' : 'text-faint'}`}>{formatCurrency(customer.balance)}</TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more customers on this page.'
                        : <>No customers found.{hasActiveFilters && ' Try clearing the search or status filter.'}</>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={customers.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="customers"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}
    </div>
  )
}
