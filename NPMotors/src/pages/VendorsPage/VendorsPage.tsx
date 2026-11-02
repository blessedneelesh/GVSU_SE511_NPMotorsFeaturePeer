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
import { useVendorDetail } from '../../hooks/useVendorDetail'
import { useVendorMutations } from '../../hooks/useVendorMutations'
import { useVendors } from '../../hooks/useVendors'
import type { Vendor, VendorTypeFilter } from '../../types/vendors'
import { VendorDetail } from './VendorDetail'
import { VendorFormDialog } from './VendorFormDialog'
import { formatCurrency, VENDOR_TYPE_LABELS, VENDOR_TYPES } from './vendorMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './VendorsPage.css'

const pageSizeOptions = [5, 10, 25, 50]

const SAVED_BANNER_MS = 4000

const typeOptions: { value: VendorTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  ...VENDOR_TYPES.map((type) => ({ value: type, label: VENDOR_TYPE_LABELS[type] })),
]

const isTypeFilter = (value: unknown): value is VendorTypeFilter =>
  typeOptions.some((option) => option.value === value)

function exportVendors(rows: Vendor[]) {
  const header = ['ID', 'Name', 'Contact', 'Phone', 'Email', 'Address', 'Type', 'Status', 'Total Purchases', 'Outstanding']
  const lines = [header, ...rows.map((v) => [v.id, v.name, v.contact, v.phone, v.email, v.address, VENDOR_TYPE_LABELS[v.type], v.status, String(v.totalPurchases), String(v.balance)])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'vendors.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function VendorsPage() {
  const {
    vendors,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setTypeFilter,
    setPage,
    setPageSize,
    retry,
  } = useVendors()
  const { selectedId, openVendor } = useVendorDetail()
  const { saveStatus, resetSave } = useVendorMutations()
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
  if (selectedId) return <VendorDetail />

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && vendors.length === 0
  const hasActiveFilters = query.searchTerm !== '' || query.type !== 'all'
  const typeLabel = typeOptions.find((option) => option.value === query.type)?.label ?? 'All Types'
  const showTable = !isInitialLoad && listStatus !== 'error'

  return (
    <div className="vendors-page">
      <header className="vendors-header">
        <div>
          <h1>Vendors</h1>
          <p>{vendors.length} {vendors.length === 1 ? 'vendor' : 'vendors'} on this page</p>
        </div>
        <div className="vendors-header__actions">
          <Button appearance="primary" icon={<Add20Regular />} onClick={openAdd}>Add Vendor</Button>
          <Button disabled={vendors.length === 0} onClick={() => exportVendors(vendors)}>Export</Button>
        </div>
      </header>

      {isAddOpen && !isSaved && <VendorFormDialog onClose={closeAdd} />}

      {isSaved && (
        <MessageBar intent="success" className="vendors-message">
          <MessageBarBody>Vendor added successfully.</MessageBarBody>
          <MessageBarActions>
            <Button appearance="transparent" size="small" onClick={closeAdd}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <div className="vendors-filters">
        <SearchBox
          className="vendors-filters__search"
          aria-label="Search vendors"
          placeholder="Search vendors…"
          value={searchInput}
          onChange={(_, data) => setSearchInput(data.value)}
        />
        <Dropdown
          className="vendors-filters__type"
          aria-label="Filter by type"
          value={typeLabel}
          selectedOptions={[query.type]}
          onOptionSelect={(_, data) => { if (isTypeFilter(data.optionValue)) setTypeFilter(data.optionValue) }}
        >
          {typeOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
      </div>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="vendors-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load vendors</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card vendors-loading">
          <Spinner label="Loading vendors…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Vendors" aria-busy={isLoading} className="data-table vendors-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Vendor name</TableHeaderCell>
                  <TableHeaderCell>Contact</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell className="num">Total purchases</TableHeaderCell>
                  <TableHeaderCell className="num">Outstanding</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id || vendor.name}>
                    <TableCell>
                      <div className="vendor-cell">
                        <Link as="button" className="vendor-cell__name" disabled={!vendor.id} onClick={() => openVendor(vendor.id)}>
                          {vendor.name}
                        </Link>
                        <span className="text-xs text-faint">{vendor.email || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="vendor-cell text-xs text-secondary">
                        <span>{vendor.contact || '—'}</span>
                        <span>{vendor.phone || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="type-chip">{VENDOR_TYPE_LABELS[vendor.type]}</span></TableCell>
                    <TableCell className="num">{formatCurrency(vendor.totalPurchases)}</TableCell>
                    <TableCell className={`num strong ${vendor.balance > 0 ? 'text-red' : 'text-faint'}`}>
                      {vendor.balance > 0 ? formatCurrency(vendor.balance) : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`badge ${vendor.status === 'Active' ? 'badge-posted' : 'badge-cancelled'}`}>{vendor.status}</span>
                    </TableCell>
                    <TableCell>
                      <Link as="button" className="text-xs" disabled={!vendor.id} aria-label={`View ${vendor.name}`} onClick={() => openVendor(vendor.id)}>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more vendors on this page.'
                        : <>No vendors found.{hasActiveFilters && ' Try clearing the search or type filter.'}</>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={vendors.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="vendors"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}
    </div>
  )
}
