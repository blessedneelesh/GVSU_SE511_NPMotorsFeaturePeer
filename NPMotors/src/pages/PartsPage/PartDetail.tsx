import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components'
import { Wrench24Regular } from '@fluentui/react-icons'
import { usePartDetail } from '../../hooks/usePartDetail'
import { usePartVendorOptions } from '../../hooks/usePartVendorOptions'
import type { Part } from '../../types/parts'
import { formatCurrency, formatPrice, stockBadge, stockLabel } from './partMetrics'

// Loads the selected part from GetPartById via Redux; the list page decides when it's shown
export function PartDetail() {
  const { part, detailStatus, detailError, closePart, retry } = usePartDetail()
  const { vendorName } = usePartVendorOptions()

  return (
    <div className="parts-page">
      <nav className="parts-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closePart}>← Parts</button>
        <span aria-hidden="true">/</span>
        <strong>{part?.name || part?.partNumber || 'Part'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="parts-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load part</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card parts-loading">
          <Spinner label="Loading part…" />
        </section>
      )}

      {detailStatus === 'success' && part && <PartProfile part={part} vendor={vendorName(part.vendorId)} />}
    </div>
  )
}

function Facts({ rows }: { rows: [string, string, string?][] }) {
  return (
    <dl className="part-facts">
      {rows.map(([label, value, className]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={className}>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

// The design has no part detail screen; this follows the Vehicle detail layout with the fields GetPartById returns
function PartProfile({ part, vendor }: { part: Part; vendor: string }) {
  const badgeClass = `badge ${stockBadge(part.isLowStock)}`

  const stats = [
    { label: 'Cost', value: formatPrice(part.costPrice), className: '' },
    { label: 'Sell Price', value: formatPrice(part.sellPrice), className: 'text-green' },
    { label: 'Qty on Hand', value: String(part.quantity), className: part.isLowStock ? 'text-red' : '' },
    { label: 'Stock Value (Cost)', value: formatCurrency(part.inventoryValue), className: 'text-blue' },
    { label: 'Stock Value (Retail)', value: formatCurrency(part.sellPrice * part.quantity), className: 'text-green' },
  ]

  return (
    <>
      <section className="card part-hero">
        <div className="part-hero__header">
          <div className="part-hero__icon" aria-hidden="true"><Wrench24Regular /></div>
          <div>
            <h1>{part.name || 'Unnamed part'}</h1>
            <p className="mono">{part.partNumber || '—'}</p>
          </div>
          <span className={`${badgeClass} part-hero__badge`}>{stockLabel(part.isLowStock)}</span>
        </div>
        <dl className="part-hero__stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd className={`mono ${stat.className}`}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card part-panel part-panel--columns">
        <div>
          <h2 className="section-title">Part Info</h2>
          <Facts rows={[
            ['Part ID', part.id, 'mono'],
            ['Part Number', part.partNumber, 'mono'],
            ['Description', part.name],
            ['Category', part.category],
            ['Vendor', vendor],
          ]} />
        </div>
        <div>
          <h2 className="section-title">Stock</h2>
          <Facts rows={[
            ['Warehouse', part.warehouse],
            ['Quantity', String(part.quantity), part.isLowStock ? 'text-red' : undefined],
            ['Reorder At', String(part.reorderLevel)],
            ['Status', stockLabel(part.isLowStock)],
          ]} />
        </div>
      </section>
    </>
  )
}
