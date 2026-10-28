import { useId } from 'react'
import { Button, Dropdown, Option } from '@fluentui/react-components'
import { ChevronLeft20Regular, ChevronRight20Regular } from '@fluentui/react-icons'
import './TablePagination.css'

export interface TablePaginationProps {
  pageNumber: number
  pageSize: number
  rowCount: number
  hasPrevious: boolean
  hasNext: boolean
  pageSizeOptions: number[]
  /** Plural noun for screen readers, e.g. "customers" or "invoices" */
  itemLabel: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

// Works without a total count: paging is driven by hasPrevious/hasNext from the current page
export function TablePagination({
  pageNumber,
  pageSize,
  rowCount,
  hasPrevious,
  hasNext,
  pageSizeOptions,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const id = useId()
  const sizeLabelId = `${id}-size-label`
  const firstRow = (pageNumber - 1) * pageSize + 1
  const lastRow = firstRow + rowCount - 1

  return (
    <div className="table-pagination">
      <p className="table-pagination__summary" aria-live="polite">
        {rowCount > 0 ? <>Showing <strong>{firstRow}–{lastRow}</strong></> : 'No rows'}
      </p>

      <div className="table-pagination__controls">
        <div className="table-pagination__size">
          <span id={sizeLabelId}>Rows per page</span>
          <Dropdown
            aria-labelledby={sizeLabelId}
            size="small"
            className="table-pagination__size-dropdown"
            value={String(pageSize)}
            selectedOptions={[String(pageSize)]}
            onOptionSelect={(_, data) => {
              const size = Number(data.optionValue)
              if (Number.isInteger(size) && size > 0) onPageSizeChange(size)
            }}
          >
            {pageSizeOptions.map((option) => <Option key={option} value={String(option)}>{String(option)}</Option>)}
          </Dropdown>
        </div>

        <nav className="table-pagination__pages" aria-label={`${itemLabel} pagination`}>
          <Button size="small" icon={<ChevronLeft20Regular />} disabled={!hasPrevious} onClick={() => onPageChange(pageNumber - 1)}>
            Previous
          </Button>
          <span className="table-pagination__page" aria-current="page">Page {pageNumber}</span>
          <Button size="small" icon={<ChevronRight20Regular />} iconPosition="after" disabled={!hasNext} onClick={() => onPageChange(pageNumber + 1)}>
            Next
          </Button>
        </nav>
      </div>
    </div>
  )
}
