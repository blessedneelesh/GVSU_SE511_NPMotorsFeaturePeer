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
import { usePartDetail } from '../../hooks/usePartDetail'
import { usePartMutations } from '../../hooks/usePartMutations'
import { useParts } from '../../hooks/useParts'
import { usePartVendorOptions } from '../../hooks/usePartVendorOptions'
import type { Part, PartCategoryFilter, PartStockFilter } from '../../types/parts'
import { PartDetail } from './PartDetail'
import { ReceivePartsDialog } from './ReceivePartsDialog'
import { formatPrice, PART_CATEGORIES, stockBadge, stockLabel } from './partMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './PartsPage.css'

const pageSizeOptions = [5, 10, 25, 50]

// As in the design, the receipt banner and the "Just received" highlights clear after five seconds
const RECEIVED_HIGHLIGHT_MS = 5000

const categoryOptions: { value: PartCategoryFilter; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  ...PART_CATEGORIES.map((category) => ({ value: category, label: category })),
]

const isCategoryFilter = (value: unknown): value is PartCategoryFilter =>
  categoryOptions.some((option) => option.value === value)

// Not in the design's filter row, but GetAllParts supports LowStockOnly and the design tracks low stock items
const stockOptions: { value: PartStockFilter; label: string }[] = [
  { value: 'all', label: 'All Stock' },
  { value: 'low', label: 'Low Stock Only' },
]

const isStockFilter = (value: unknown): value is PartStockFilter =>
  stockOptions.some((option) => option.value === value)

function exportParts(rows: Part[], vendorName: (vendorId: string) => string) {
  const header = ['ID', 'Part Number', 'Description', 'Category', 'Vendor', 'Cost', 'Sell Price', 'Qty', 'Reorder At', 'Warehouse', 'Stock Value', 'Status']
  const lines = [header, ...rows.map((p) => [
    p.id, p.partNumber, p.name, p.category, vendorName(p.vendorId), String(p.costPrice), String(p.sellPrice),
    String(p.quantity), String(p.reorderLevel), p.warehouse, String(p.inventoryValue), stockLabel(p.isLowStock),
  ])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'parts.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function PartsPage() {
  const {
    parts,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setCategoryFilter,
    setStockFilter,
    setPage,
    setPageSize,
    retry,
  } = useParts()
  const { selectedId, openPart } = usePartDetail()
  const { resetSave } = usePartMutations()
  const { vendorName } = usePartVendorOptions()
  const [isReceiveOpen, setReceiveOpen] = useState(false)
  // UI-only: the parts whose stock the last receipt raised
  const [justReceived, setJustReceived] = useState<string[]>([])

  const openReceive = () => {
    resetSave()
    setReceiveOpen(true)
  }
  const closeReceive = useCallback(() => {
    resetSave()
    setReceiveOpen(false)
  }, [resetSave])
  const finishReceive = (partIds: string[]) => {
    closeReceive()
    setJustReceived(partIds)
  }

  useEffect(() => {
    if (justReceived.length === 0) return
    const timer = window.setTimeout(() => setJustReceived([]), RECEIVED_HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [justReceived])

  // The list hook stays mounted while the detail view is open, so its query and page are kept
  if (selectedId) return <PartDetail />

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && parts.length === 0
  const hasActiveFilters = query.searchTerm !== '' || query.category !== 'all' || query.stock !== 'all'
  const categoryLabel = categoryOptions.find((option) => option.value === query.category)?.label ?? 'All Categories'
  const stockFilterLabel = stockOptions.find((option) => option.value === query.stock)?.label ?? 'All Stock'
  const showTable = !isInitialLoad && listStatus !== 'error'

  return (
    <div className="parts-page">
      <header className="parts-header">
        <div>
          <h1>Parts &amp; Service Inventory</h1>
          <p>{parts.length} {parts.length === 1 ? 'part' : 'parts'} on this page</p>
        </div>
        <div className="parts-header__actions">
          <Button appearance="primary" icon={<Add20Regular />} onClick={openReceive}>Receive Parts</Button>
          <Button disabled={parts.length === 0} onClick={() => exportParts(parts, vendorName)}>Export</Button>
        </div>
      </header>

      {isReceiveOpen && <ReceivePartsDialog onClose={closeReceive} onDone={finishReceive} />}

      {justReceived.length > 0 && (
        <MessageBar intent="success" className="parts-message">
          <MessageBarBody>Parts receipt posted — inventory quantities updated.</MessageBarBody>
          <MessageBarActions>
            <Button appearance="transparent" size="small" onClick={() => setJustReceived([])}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <div className="parts-filters">
        <SearchBox
          className="parts-filters__search"
          aria-label="Search parts"
          placeholder="Search parts…"
          value={searchInput}
          onChange={(_, data) => setSearchInput(data.value)}
        />
        <Dropdown
          className="parts-filters__select"
          aria-label="Filter parts by category"
          value={categoryLabel}
          selectedOptions={[query.category]}
          onOptionSelect={(_, data) => { if (isCategoryFilter(data.optionValue)) setCategoryFilter(data.optionValue) }}
        >
          {categoryOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
        <Dropdown
          className="parts-filters__select"
          aria-label="Filter parts by stock level"
          value={stockFilterLabel}
          selectedOptions={[query.stock]}
          onOptionSelect={(_, data) => { if (isStockFilter(data.optionValue)) setStockFilter(data.optionValue) }}
        >
          {stockOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
      </div>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="parts-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load parts</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card parts-loading">
          <Spinner label="Loading parts…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Parts" aria-busy={isLoading} className="data-table parts-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className="col-number">Part Number</TableHeaderCell>
                  <TableHeaderCell className="col-description">Description</TableHeaderCell>
                  <TableHeaderCell className="col-category">Category</TableHeaderCell>
                  <TableHeaderCell className="col-vendor">Vendor</TableHeaderCell>
                  <TableHeaderCell className="num col-money">Cost</TableHeaderCell>
                  <TableHeaderCell className="num col-money">Sell Price</TableHeaderCell>
                  <TableHeaderCell className="num col-qty">Qty</TableHeaderCell>
                  <TableHeaderCell className="col-status">Status</TableHeaderCell>
                  <TableHeaderCell className="col-actions">Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => {
                  const isJustReceived = justReceived.includes(part.id)
                  return (
                    <TableRow key={part.id || part.partNumber || part.name} className={isJustReceived ? 'is-just-received' : undefined}>
                      <TableCell className="mono text-xs text-muted">{part.partNumber || '—'}</TableCell>
                      <TableCell>
                        <div className="part-cell">
                          <Link as="button" className="part-cell__name" disabled={!part.id} onClick={() => openPart(part.id)}>
                            {part.name || part.partNumber || 'Unnamed part'}
                          </Link>
                          {isJustReceived && <span className="part-cell__received">↑ Just received</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {part.category ? <span className="part-category">{part.category}</span> : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted">{vendorName(part.vendorId) || '—'}</TableCell>
                      <TableCell className="num text-secondary">{formatPrice(part.costPrice)}</TableCell>
                      <TableCell className="num text-green-dark">{formatPrice(part.sellPrice)}</TableCell>
                      <TableCell className={`num strong ${part.isLowStock ? 'text-red' : 'text-dark'}`}>{part.quantity}</TableCell>
                      <TableCell>
                        <span className={`badge ${stockBadge(part.isLowStock)}`}>{stockLabel(part.isLowStock)}</span>
                      </TableCell>
                      <TableCell>
                        <Link as="button" className="text-xs" disabled={!part.id} aria-label={`View ${part.name || part.partNumber}`} onClick={() => openPart(part.id)}>
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {parts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more parts on this page.'
                        : <>No parts found.{hasActiveFilters && ' Try clearing the search or filters.'}</>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={parts.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="parts"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}
    </div>
  )
}
