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
import { useBankAccountDetail } from '../../hooks/useBankAccountDetail'
import { useBankAccountMutations } from '../../hooks/useBankAccountMutations'
import { useBankAccounts } from '../../hooks/useBankAccounts'
import { useBankOptions } from '../../hooks/useBankOptions'
import type { BankAccount } from '../../types/bankAccounts'
import { BankAccountDetail } from './BankAccountDetail'
import { BankAccountFormDialog } from './BankAccountFormDialog'
import { formatCurrency } from './bankAccountMetrics'
import { TablePagination } from '../../components/TablePagination/TablePagination'
import './BankAccountsPage.css'

const pageSizeOptions = [5, 10, 25, 50]

const SAVED_BANNER_MS = 4000

function exportBankAccounts(rows: BankAccount[]) {
  const header = ['ID', 'Account Name', 'Bank', 'Account Number', 'Type', 'Routing', 'Balance', 'Status']
  const lines = [header, ...rows.map((a) => [a.id, a.name, a.bankName, a.accountNumber, a.type, a.routing, String(a.bookBalance), a.status])]
  const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'bankAccounts.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function BankAccountsPage() {
  const {
    bankAccounts,
    query,
    hasNext,
    hasPrevious,
    listStatus,
    listError,
    searchInput,
    setSearchInput,
    setBankFilter,
    setPage,
    setPageSize,
    retry,
  } = useBankAccounts()
  const { selectedId, openBankAccount } = useBankAccountDetail()
  const { saveStatus, resetSave } = useBankAccountMutations()
  const { bankOptions } = useBankOptions()
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
  if (selectedId) return <BankAccountDetail />

  // Built from the loaded banks, so the guard below also rejects ids that are no longer offered
  const bankFilterOptions = [{ value: 'all', label: 'All Banks' }, ...bankOptions.map((bank) => ({ value: bank.id, label: bank.name }))]
  const isBankFilter = (value: unknown): value is string => bankFilterOptions.some((option) => option.value === value)

  const isLoading = listStatus === 'loading'
  const isInitialLoad = (isLoading || listStatus === 'idle') && bankAccounts.length === 0
  const hasActiveFilters = query.searchTerm !== '' || query.bankId !== 'all'
  const bankLabel = bankFilterOptions.find((option) => option.value === query.bankId)?.label ?? 'All Banks'
  const showTable = !isInitialLoad && listStatus !== 'error'

  return (
    <div className="bank-accounts-page">
      <header className="bank-accounts-header">
        <div>
          <h1>Banks &amp; Accounts</h1>
          <p>{bankAccounts.length} {bankAccounts.length === 1 ? 'account' : 'accounts'} on this page</p>
        </div>
        <div className="bank-accounts-header__actions">
          <Button appearance="primary" icon={<Add20Regular />} onClick={openAdd}>Add Bank Account</Button>
          <Button disabled={bankAccounts.length === 0} onClick={() => exportBankAccounts(bankAccounts)}>Export</Button>
        </div>
      </header>

      {isAddOpen && !isSaved && <BankAccountFormDialog onClose={closeAdd} />}

      {isSaved && (
        <MessageBar intent="success" className="bank-accounts-message">
          <MessageBarBody>Bank account added successfully.</MessageBarBody>
          <MessageBarActions>
            <Button appearance="transparent" size="small" onClick={closeAdd}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <div className="bank-accounts-filters">
        <SearchBox
          className="bank-accounts-filters__search"
          aria-label="Search bank accounts"
          placeholder="Search accounts…"
          value={searchInput}
          onChange={(_, data) => setSearchInput(data.value)}
        />
        <Dropdown
          className="bank-accounts-filters__bank"
          aria-label="Filter by bank"
          value={bankLabel}
          selectedOptions={[query.bankId]}
          onOptionSelect={(_, data) => { if (isBankFilter(data.optionValue)) setBankFilter(data.optionValue) }}
        >
          {bankFilterOptions.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
        </Dropdown>
      </div>

      {listStatus === 'error' && (
        <MessageBar intent="error" className="bank-accounts-message">
          <MessageBarBody>
            <MessageBarTitle>Couldn&apos;t load bank accounts</MessageBarTitle>
            {listError}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={retry}>Retry</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      {isInitialLoad && (
        <section className="card bank-accounts-loading">
          <Spinner label="Loading bank accounts…" />
        </section>
      )}

      {showTable && (
        <section className="card">
          <div className={`table-scroll ${isLoading ? 'is-refreshing' : ''}`}>
            <Table aria-label="Bank accounts" aria-busy={isLoading} className="data-table bank-accounts-table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Account name</TableHeaderCell>
                  <TableHeaderCell>Bank</TableHeaderCell>
                  <TableHeaderCell>Account number</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Routing</TableHeaderCell>
                  <TableHeaderCell className="num">Balance</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account) => (
                  <TableRow key={account.id || `${account.bankId}-${account.name}`}>
                    <TableCell>
                      <Link as="button" className="bank-account-cell__name" disabled={!account.id} onClick={() => openBankAccount(account.id)}>
                        {account.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-secondary">{account.bankName || '—'}</TableCell>
                    <TableCell className="mono text-xs text-muted">{account.accountNumber || '—'}</TableCell>
                    <TableCell className="text-xs text-secondary">{account.type || '—'}</TableCell>
                    <TableCell className="mono text-xs text-muted">{account.routing || '—'}</TableCell>
                    <TableCell className="num strong text-dark">{formatCurrency(account.bookBalance)}</TableCell>
                    <TableCell>
                      <span className={`badge ${account.status === 'Active' ? 'badge-posted' : 'badge-cancelled'}`}>{account.status}</span>
                    </TableCell>
                    <TableCell>
                      <Link as="button" className="text-xs" disabled={!account.id} aria-label={`View ${account.name}`} onClick={() => openBankAccount(account.id)}>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {bankAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="table-empty">
                      {query.pageNumber > 1
                        ? 'No more bank accounts on this page.'
                        : <>No bank accounts found.{hasActiveFilters && ' Try clearing the search or bank filter.'}</>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            pageNumber={query.pageNumber}
            pageSize={query.pageSize}
            rowCount={bankAccounts.length}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            pageSizeOptions={pageSizeOptions}
            itemLabel="bank accounts"
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      )}
    </div>
  )
}
