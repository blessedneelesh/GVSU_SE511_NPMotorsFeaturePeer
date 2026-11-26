import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useVehicleDetail } from '../../hooks/useVehicleDetail'
import { useVehiclePurchase } from '../../hooks/useVehiclePurchase'
import { useVehicles } from '../../hooks/useVehicles'
import type { Vehicle, VehiclePurchaseResult, VehicleStatusFilter } from '../../types/vehicles'
import { formatAmount } from '../PurchaseVehiclePage/purchaseVehicleForm'
import { VehicleDetail } from './VehicleDetail'
import { formatCurrency, shortVin, VEHICLE_STATUS_BADGES, VEHICLE_STATUS_LABELS } from './vehicleMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './VehiclesPage.css'

const pageSizeOptions = [5, 10, 25, 50]

const SAVED_BANNER_MS = 4000

// GetAllVehicles only filters by available or reserved (Status=sold is a 400), so the design's Sold and In Stock options are left out
const statusOptions: { value: VehicleStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
]

const isStatusFilter = (value: unknown): value is VehicleStatusFilter =>
  statusOptions.some((option) => option.value === value)

// "2024 Honda Accord was added to inventory. Paid $10,000.00 (BP-0012); $16,720.00 is on AP bill AP-0042."
function purchaseSummary(result: VehiclePurchaseResult): string {
  const parts = [`${result.title} was added to inventory.`]
  if (result.amountPaid > 0) parts.push(`Paid ${formatAmount(result.amountPaid)}${result.paymentNumber ? ` (${result.paymentNumber})` : ''}.`)
  if (result.balanceDue > 0) parts.push(`${formatAmount(result.balanceDue)} is on ${result.apBillNumber ? `AP bill ${result.apBillNumber}` : 'Accounts Payable'}.`)
  return parts.join(' ')
}

function exportVehicles(rows: Vehicle[]) {
  const header = ['ID', 'VIN', 'Year', 'Make', 'Model', 'Color', 'Warehouse', 'Purchase Date', 'Vendor', 'Purchase Price', 'Additional Costs', 'Total Cost', 'List Price', 'Gross Profit', 'Status']
  const lines = [header, ...rows.map((v) => [
    v.id, v.vin, v.year ? String(v.year) : '', v.make, v.model, v.color, v.warehouse, v.purchaseDate, v.vendorName,
    String(v.purchasePrice), String(v.additionalCosts), String(v.totalCost), String(v.sellingPrice), String(v.grossProfit), VEHICLE_STATUS_LABELS[v.status],
  ])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'vehicles.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function VehiclesPage() {
  const {
    vehicles,
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
  } = useVehicles()
  const { selectedId, openVehicle } = useVehicleDetail()
  const { purchaseStatus, purchaseResult, resetPurchase } = useVehiclePurchase()
  const navigate = useNavigate()

  // Coming back from Purchase Vehicle: confirm what was posted, then hide the banner after a few seconds
  const isPurchased = purchaseStatus === 'success' && purchaseResult !== null
  useEffect(() => {
    if (!isPurchased) return
    const timer = window.setTimeout(resetPurchase, SAVED_BANNER_MS)
    return () => window.clearTimeout(timer)
  }, [isPurchased, resetPurchase])

  // The list hook stays mounted while the detail view is open, so its query and page are kept
  if (selectedId) return <VehicleDetail />

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && vehicles.length === 0
  const hasActiveFilters = query.searchTerm !== '' || query.status !== 'all'
  const statusLabel = statusOptions.find((option) => option.value === query.status)?.label ?? 'All Status'
  const showTable = !isInitialLoad && listStatus !== 'error'

  return (
    <div className="vehicles-page">
      <header className="vehicles-header">
        <div>
          <h1>Vehicle Inventory</h1>
          <p>{vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} on this page</p>
        </div>
        <div className="vehicles-header__actions">
          <Button appearance="primary" icon={<Add20Regular />} onClick={() => navigate('/purchase-vehicle')}>Purchase Vehicle</Button>
          <Button disabled={vehicles.length === 0} onClick={() => exportVehicles(vehicles)}>Export</Button>
        </div>
      </header>

      {isPurchased && (
        <MessageBar intent="success" className="vehicles-message">
          <MessageBarBody>
            <MessageBarTitle>Purchase posted</MessageBarTitle>
            {purchaseSummary(purchaseResult)}
          </MessageBarBody>
          <MessageBarActions>
            <Button appearance="transparent" size="small" onClick={resetPurchase}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <div className="vehicles-filters">
        <SearchBox
          className="vehicles-filters__search"
          aria-label="Search vehicles"
          placeholder="Search by make, model, VIN…"
          value={searchInput}
          onChange={(_, data) => setSearchInput(data.value)}
        />
        <Dropdown
          className="vehicles-filters__status"
          aria-label="Filter vehicles by status"
          value={statusLabel}
          selectedOptions={[query.status]}
          onOptionSelect={(_, data) => { if (isStatusFilter(data.optionValue)) setStatusFilter(data.optionValue) }}
        >
          {statusOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
      </div>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="vehicles-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load vehicles</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card vehicles-loading">
          <Spinner label="Loading vehicles…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Vehicles" aria-busy={isLoading} className="data-table vehicles-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className="col-vin">VIN</TableHeaderCell>
                  <TableHeaderCell className="col-vehicle">Vehicle</TableHeaderCell>
                  <TableHeaderCell className="col-color">Color</TableHeaderCell>
                  <TableHeaderCell className="col-warehouse">Warehouse</TableHeaderCell>
                  <TableHeaderCell className="num col-money">Cost</TableHeaderCell>
                  <TableHeaderCell className="num col-money">List Price</TableHeaderCell>
                  <TableHeaderCell className="num col-money">Profit</TableHeaderCell>
                  <TableHeaderCell className="col-status">Status</TableHeaderCell>
                  <TableHeaderCell className="col-actions">Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id || vehicle.vin || vehicle.title}>
                    <TableCell className="mono text-xs text-muted">
                      <span title={vehicle.vin || undefined}>{shortVin(vehicle.vin) || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="vehicle-cell">
                        <Link as="button" className="vehicle-cell__name" disabled={!vehicle.id} onClick={() => openVehicle(vehicle.id)}>
                          {vehicle.title}
                        </Link>
                        <span className="text-xs text-faint">{vehicle.purchaseDate || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-secondary">{vehicle.color || '—'}</TableCell>
                    <TableCell className="text-xs text-muted">{vehicle.warehouse || '—'}</TableCell>
                    <TableCell className="num">{formatCurrency(vehicle.totalCost)}</TableCell>
                    <TableCell className="num">{formatCurrency(vehicle.sellingPrice)}</TableCell>
                    <TableCell className={`num strong ${vehicle.grossProfit >= 0 ? 'text-green' : 'text-red'}`}>
                      {formatCurrency(vehicle.grossProfit)}
                    </TableCell>
                    <TableCell>
                      <span className={`badge ${VEHICLE_STATUS_BADGES[vehicle.status]}`}>{VEHICLE_STATUS_LABELS[vehicle.status]}</span>
                    </TableCell>
                    <TableCell>
                      <Link as="button" className="text-xs" disabled={!vehicle.id} aria-label={`View ${vehicle.title}`} onClick={() => openVehicle(vehicle.id)}>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {vehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more vehicles on this page.'
                        : <>No vehicles found.{hasActiveFilters && ' Try clearing the search or status filter.'}</>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={vehicles.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="vehicles"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}
    </div>
  )
}
