import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components'
import { BuildingFactory24Regular } from '@fluentui/react-icons'
import { useVendorDetail } from '../../hooks/useVendorDetail'
import type { Vendor } from '../../types/vendors'
import { formatCurrency, VENDOR_TYPE_LABELS } from './vendorMetrics'

// Loads the selected vendor from GetVendorById via Redux; the list page decides when it's shown
export function VendorDetail() {
  const { vendor, detailStatus, detailError, closeVendor, retry } = useVendorDetail()

  return (
    <div className="vendors-page">
      <nav className="vendors-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="link-button" onClick={closeVendor}>← Vendors</button>
        <span aria-hidden="true">/</span>
        <strong>{vendor?.name ?? 'Vendor'}</strong>
      </nav>

      {detailStatus === 'error' && (
        <MessageBar intent="error" className="vendors-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load vendor</MessageBarTitle>
            {detailError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {detailStatus === 'loading' && (
        <section className="card vendors-loading">
          <Spinner label="Loading vendor…" />
        </section>
      )}

      {detailStatus === 'success' && vendor && <VendorProfile vendor={vendor} />}
    </div>
  )
}

// The design's "Outstanding Bills" table is left out until an accounts-payable API exists
function VendorProfile({ vendor }: { vendor: Vendor }) {
  const contactLine = [vendor.phone, vendor.email].filter(Boolean).join(' · ')

  return (
    <div className="vendor-overview">
      <section className="card vendor-profile">
        <div className="vendor-profile__header">
          <div className="vendor-icon" aria-hidden="true"><BuildingFactory24Regular /></div>
          <div>
            <h1>{vendor.name}</h1>
            <p>Contact: {vendor.contact || '—'}</p>
            <p>{contactLine || '—'}</p>
          </div>
          <span className="badge badge-posted">{VENDOR_TYPE_LABELS[vendor.type]}</span>
        </div>
        <dl className="vendor-profile__facts">
          <div><dt>Address:</dt> <dd>{vendor.address || '—'}</dd></div>
          <div><dt>Status:</dt> <dd>{vendor.status}</dd></div>
          <div><dt>Vendor ID:</dt> <dd className="mono">{vendor.id || '—'}</dd></div>
        </dl>
      </section>
      <div className="vendor-stats">
        <div className="stat-card">
          <div className="stat-label">Total Purchases</div>
          <div className="stat-value stat-value--blue">{formatCurrency(vendor.totalPurchases)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding Payable</div>
          <div className={`stat-value ${vendor.balance > 0 ? 'stat-value--red' : 'stat-value--green'}`}>{formatCurrency(vendor.balance)}</div>
        </div>
      </div>
    </div>
  )
}
