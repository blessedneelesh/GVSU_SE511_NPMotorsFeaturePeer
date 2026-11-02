import { useState } from 'react'
import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Tab,
  TabList,
} from '@fluentui/react-components'
import { VehicleCarProfileLtr24Regular } from '@fluentui/react-icons'
import { useVehicleDetail } from '../../hooks/useVehicleDetail'
import type { Vehicle } from '../../types/vehicles'
import { formatCurrency, formatMargin, VEHICLE_STATUS_BADGES, VEHICLE_STATUS_LABELS } from './vehicleMetrics'

// Loads the selected vehicle from GetVehicleById via Redux; the list page decides when it's shown
export function VehicleDetail() {
  const { vehicle, detailStatus, detailError, closeVehicle, retry } = useVehicleDetail()

  return (
    <div className="vehicles-page">
      <nav className="vehicles-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closeVehicle}>← Vehicles</button>
        <span aria-hidden="true">/</span>
        <strong>{vehicle?.title ?? 'Vehicle'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="vehicles-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load vehicle</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card vehicles-loading">
          <Spinner label="Loading vehicle…" />
        </section>
      )}

      {detailStatus === 'success' && vehicle && <VehicleProfile vehicle={vehicle} />}
    </div>
  )
}

type DetailTab = 'overview' | 'costs'

const isDetailTab = (value: unknown): value is DetailTab => value === 'overview' || value === 'costs'

const profitClass = (amount: number) => (amount >= 0 ? 'text-green' : 'text-red')

function Facts({ rows }: { rows: [string, string, string?][] }) {
  return (
    <dl className="vehicle-facts">
      {rows.map(([label, value, className]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={className}>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

// The design's Sale & Customer and Service History tabs, its Actions card and the vendor contact box are left
// out: GetVehicleById has no sale, service or vendor contact data, and those actions lead to unbuilt screens.
function VehicleProfile({ vehicle }: { vehicle: Vehicle }) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const isSold = vehicle.status === 'sold'
  const statusLabel = VEHICLE_STATUS_LABELS[vehicle.status]
  const badgeClass = `badge ${VEHICLE_STATUS_BADGES[vehicle.status]}`

  const stats = [
    { label: 'Purchase Price', value: formatCurrency(vehicle.purchasePrice), className: '' },
    { label: 'Total Cost', value: formatCurrency(vehicle.totalCost), className: 'text-blue' },
    { label: 'List Price', value: formatCurrency(vehicle.sellingPrice), className: '' },
    { label: 'Gross Profit', value: formatCurrency(vehicle.grossProfit), className: profitClass(vehicle.grossProfit) },
    { label: 'Margin', value: formatMargin(vehicle.grossMargin), className: profitClass(vehicle.grossProfit) },
  ]

  return (
    <>
      <section className="card vehicle-hero">
        <div className="vehicle-hero__header">
          <div className="vehicle-hero__icon" aria-hidden="true"><VehicleCarProfileLtr24Regular /></div>
          <div>
            <h1>{vehicle.title}</h1>
            <p className="mono">VIN: {vehicle.vin || '—'}</p>
          </div>
          <span className={`${badgeClass} vehicle-hero__badge`}>{statusLabel}</span>
        </div>
        <dl className="vehicle-hero__stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd className={`mono ${stat.className}`}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="vehicle-overview">
        <section className="card">
          <TabList
            className="vehicle-tabs"
            selectedValue={tab}
            onTabSelect={(_, data) => { if (isDetailTab(data.value)) setTab(data.value) }}
          >
            <Tab value="overview">Overview</Tab>
            <Tab value="costs">Cost Breakdown</Tab>
          </TabList>

          {tab === 'overview' && (
            <div className="vehicle-panel vehicle-panel--columns" role="tabpanel" aria-label="Overview">
              <div>
                <h2 className="section-title">Vehicle Specs</h2>
                <Facts rows={[
                  ['Make', vehicle.make],
                  ['Model', vehicle.model],
                  ['Year', vehicle.year ? String(vehicle.year) : ''],
                  ['Color', vehicle.color],
                  ['VIN', vehicle.vin, 'mono text-xs'],
                  ['For Sale', vehicle.isAvailable ? 'Yes' : 'No'],
                ]} />
              </div>
              <div>
                <h2 className="section-title">Inventory Info</h2>
                <Facts rows={[
                  ['Vehicle ID', vehicle.id, 'mono'],
                  ['Warehouse', vehicle.warehouse],
                  ['Purchase Date', vehicle.purchaseDate],
                  ['Status', statusLabel],
                  ['Vendor', vehicle.vendorName || vehicle.vendorId],
                ]} />
              </div>
            </div>
          )}

          {tab === 'costs' && (
            <div className="vehicle-panel" role="tabpanel" aria-label="Cost Breakdown">
              <h2 className="section-title">Acquisition Costs</h2>
              {/* The API stores one additional-costs figure, so the design's transport/taxes/other split isn't shown */}
              <dl className="vehicle-costs">
                <div>
                  <dt>Purchase Price<span>Paid to vendor</span></dt>
                  <dd className="mono">{formatCurrency(vehicle.purchasePrice)}</dd>
                </div>
                <div>
                  <dt>Additional Costs<span>Transport, taxes and fees</span></dt>
                  <dd className="mono">{formatCurrency(vehicle.additionalCosts)}</dd>
                </div>
              </dl>
              <div className="vehicle-total">
                <span>Total Inventory Cost</span>
                <strong className="mono">{formatCurrency(vehicle.totalCost)}</strong>
              </div>

              {isSold ? (
                <>
                  <h2 className="section-title">Profitability</h2>
                  <dl className="vehicle-profit">
                    <div>
                      <dt>Selling Price</dt>
                      <dd className="mono">{formatCurrency(vehicle.sellingPrice)}</dd>
                    </div>
                    <div>
                      <dt>Total Cost</dt>
                      <dd className="mono text-red">{formatCurrency(-vehicle.totalCost)}</dd>
                    </div>
                    <div className={`vehicle-profit__total ${vehicle.grossProfit >= 0 ? 'is-gain' : 'is-loss'}`}>
                      <dt>Gross Profit</dt>
                      <dd>
                        <span className="mono">{formatCurrency(vehicle.grossProfit)}</span>
                        <small>Margin {formatMargin(vehicle.grossMargin)}</small>
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="vehicle-projection">
                  <div className="vehicle-projection__label">Projected Gross Profit</div>
                  <div className="vehicle-projection__row">
                    <span>At list price of {formatCurrency(vehicle.sellingPrice)}</span>
                    <strong className={`mono ${profitClass(vehicle.grossProfit)}`}>{formatCurrency(vehicle.grossProfit)}</strong>
                  </div>
                  <div className="vehicle-projection__note">Margin {formatMargin(vehicle.grossMargin)} · Not yet realized</div>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="vehicle-sidebar">
          <section className="card vehicle-side-card">
            <h2 className="section-title">Status</h2>
            <span className={badgeClass}>{statusLabel}</span>
            <p>Purchased: <strong>{vehicle.purchaseDate || '—'}</strong></p>
            <p>Warehouse: <strong>{vehicle.warehouse || '—'}</strong></p>
          </section>
          <section className="card vehicle-side-card">
            <h2 className="section-title">Financials</h2>
            <dl className="vehicle-financials">
              <div>
                <dt>Total Cost</dt>
                <dd className="mono text-blue">{formatCurrency(vehicle.totalCost)}</dd>
              </div>
              <div>
                <dt>{isSold ? 'Sale Price' : 'List Price'}</dt>
                <dd className="mono">{formatCurrency(vehicle.sellingPrice)}</dd>
              </div>
              <div className={`vehicle-financials__profit ${profitClass(vehicle.grossProfit)}`}>
                <dt>{isSold ? 'Gross Profit' : 'Projected Profit'}</dt>
                <dd className="mono">{formatCurrency(vehicle.grossProfit)}</dd>
              </div>
              <div className="vehicle-financials__margin">
                <dt>Margin</dt>
                <dd className={profitClass(vehicle.grossProfit)}>{formatMargin(vehicle.grossMargin)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  )
}
