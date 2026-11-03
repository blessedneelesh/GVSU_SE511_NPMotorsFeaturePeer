import { useState, type FormEvent } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Option,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components'
import { Add16Regular, Checkmark24Regular, Dismiss16Regular, Dismiss20Regular } from '@fluentui/react-icons'
import { usePartMutations } from '../../hooks/usePartMutations'
import { usePartReceiveOptions } from '../../hooks/usePartReceiveOptions'
import { usePartVendorOptions } from '../../hooks/usePartVendorOptions'
import type { Part, PartReceiveLine } from '../../types/parts'
import type { VendorType } from '../../types/vendors'
import { formatPrice } from './partMetrics'
import './ReceivePartsDialog.css'

// YYYY-MM-DD in local time, the value <input type="date"> expects
const today = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const PAYMENT_METHODS = ['On Account (AP)', 'Bank Transfer', 'Cash'] as const
type PaymentMethod = (typeof PAYMENT_METHODS)[number]
const ON_ACCOUNT: PaymentMethod = 'On Account (AP)'

const isPaymentMethod = (value: unknown): value is PaymentMethod => PAYMENT_METHODS.some((method) => method === value)

// The Vendor dropdown only offers vendors of this type
const RECEIVE_VENDOR_TYPE: VendorType = 'parts'

// UpdatePart's quantity_Received is an int32 of at least 1
const MAX_QUANTITY = 2147483647

// One row of the design's "Parts Received" table, as typed
interface ReceiptLine {
  key: number
  partId: string
  quantity: string
  unitCost: string
}

const emptyLine = (key: number): ReceiptLine => ({ key, partId: '', quantity: '1', unitCost: '' })

const toNumber = (value: string) => (value.trim() ? Number(value) : NaN)

const isValidQuantity = (value: string) => {
  const quantity = toNumber(value)
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY
}

const lineTotal = (line: ReceiptLine) => toNumber(line.quantity) * toNumber(line.unitCost)

const partLabel = (part: Part | undefined) => (part ? `${part.name || 'Unnamed part'} (${part.partNumber || part.id})` : '')

interface ReceivePartsDialogProps {
  onClose: () => void
  // Called instead of onClose once any line was received, with the parts whose stock went up
  onDone: (receivedPartIds: string[]) => void
}

// Mounted only while open, so every opening starts from an empty receipt. Mirrors the Figma Make
// ReceivePartsModal; UpdatePart only stores the quantities, so the other receipt details aren't saved.
export function ReceivePartsDialog({ onClose, onDone }: ReceivePartsDialogProps) {
  const { saveStatus, saveError, receivedLines, receive } = usePartMutations()
  const { receiveOptions, receiveOptionsStatus, receiveOptionsError, retry: retryOptions } = usePartReceiveOptions()
  const { vendorOptions, vendorOptionsStatus, vendorOptionsError, retry: retryVendors } = usePartVendorOptions()
  const [vendorId, setVendorId] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [date, setDate] = useState(today)
  const [payMethod, setPayMethod] = useState<PaymentMethod>(ON_ACCOUNT)
  const [bankAccountId, setBankAccountId] = useState('')
  const [lines, setLines] = useState<ReceiptLine[]>(() => [emptyLine(1)])
  const [errors, setErrors] = useState<string[]>([])

  const { parts, bankAccounts } = receiveOptions
  const isSaving = saveStatus === 'loading'
  const isLoadingParts = receiveOptionsStatus === 'loading' || receiveOptionsStatus === 'idle'
  const isLoadingVendors = vendorOptionsStatus === 'loading' || vendorOptionsStatus === 'idle'
  const receivedIds = new Set(receivedLines.map((line) => line.partId))
  const findPart = (partId: string) => parts.find((part) => part.id === partId)
  const receiveVendors = vendorOptions.filter((option) => option.type === RECEIVE_VENDOR_TYPE)
  // GetAllParts has no vendor filter, so the loaded parts are narrowed to the selected vendor here
  const vendorParts = vendorId ? parts.filter((part) => part.vendorId === vendorId) : []

  // A receipt comes from one vendor, so switching vendor clears the parts picked for the previous one
  const selectVendor = (id: string) => {
    if (id === vendorId) return
    setVendorId(id)
    setLines((current) => current.map((line) => ({ ...line, partId: '', unitCost: '' })))
    setErrors([])
  }

  const partPlaceholder = () => {
    if (!vendorId) return 'Select a vendor first'
    if (isLoadingParts) return 'Loading parts…'
    return vendorParts.length ? 'Select part…' : 'No parts from this vendor'
  }

  const setLine = (key: number, changes: Partial<ReceiptLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)))
    setErrors([])
  }

  // As in the design, picking a part fills in its current cost price
  const selectLinePart = (key: number, partId: string) => {
    const part = findPart(partId)
    setLine(key, { partId, unitCost: part ? String(part.costPrice) : '' })
  }

  const addLine = () => setLines((current) => [...current, emptyLine(Math.max(0, ...current.map((line) => line.key)) + 1)])
  const removeLine = (key: number) => setLines((current) => current.filter((line) => line.key !== key))

  // Lines without a part are ignored, as in the design
  const validLines = lines.filter((line) => line.partId && isValidQuantity(line.quantity))
  const subtotal = validLines.reduce((sum, line) => sum + lineTotal(line), 0)
  const units = validLines.reduce((sum, line) => sum + toNumber(line.quantity), 0)

  const validate = () => {
    const found: string[] = []
    if (!vendorId) found.push('Select a vendor')
    if (validLines.length === 0) found.push('Add at least one valid line item')
    lines.forEach((line, index) => {
      if (!line.partId) return
      const label = `Line ${index + 1}`
      if (!isValidQuantity(line.quantity)) found.push(`${label}: quantity must be a whole number greater than 0`)
      const firstIndex = lines.findIndex((other) => other.partId === line.partId)
      if (firstIndex !== index) found.push(`${label}: this part is already on line ${firstIndex + 1}`)
    })
    return found
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (found.length) return
    // After a partial failure the lines already received stay locked and are not sent again
    const pending: PartReceiveLine[] = validLines
      .filter((line) => !receivedIds.has(line.partId))
      .map((line) => ({ partId: line.partId, quantity: toNumber(line.quantity) }))
    if (pending.length) receive(pending)
  }

  const close = () => {
    if (isSaving) return
    if (receivedIds.size) onDone([...receivedIds])
    else onClose()
  }

  const creditAccount = payMethod === ON_ACCOUNT ? 'Accounts Payable (Cr)' : 'Bank Account (Cr)'

  if (saveStatus === 'success') {
    const postedLines = lines.filter((line) => receivedIds.has(line.partId))
    const postedTotal = postedLines.reduce((sum, line) => sum + lineTotal(line), 0)
    const postedUnits = postedLines.reduce((sum, line) => sum + toNumber(line.quantity), 0)

    return (
      <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open) close() }}>
        <DialogSurface className="part-dialog part-dialog--posted" aria-describedby="part-dialog-posted-summary">
          <DialogBody className="part-dialog__posted">
            <div className="part-dialog__check" aria-hidden="true"><Checkmark24Regular /></div>
            <DialogTitle>Parts Received</DialogTitle>
            <p id="part-dialog-posted-summary">
              {postedUnits} units received · Total cost <strong>{formatPrice(postedTotal)}</strong>
            </p>
            <dl className="part-dialog__summary">
              {postedLines.map((line) => (
                <div key={line.key}>
                  <dt>{findPart(line.partId)?.name || line.partId} × {line.quantity}</dt>
                  <dd>{formatPrice(lineTotal(line))}</dd>
                </div>
              ))}
              <div className="part-dialog__summary-total">
                <dt>Total</dt>
                <dd>{formatPrice(postedTotal)}</dd>
              </div>
            </dl>
            <JournalPreview title="Accounting Entry" amount={postedTotal} creditAccount={creditAccount} />
            <Button appearance="primary" className="part-dialog__done" onClick={close}>Done</Button>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    )
  }

  const vendorName = vendorOptions.find((option) => option.id === vendorId)?.name ?? ''
  const effectiveBankId = bankAccountId || bankAccounts[0]?.id || ''
  const bankAccountLabel = (id: string) => {
    const account = bankAccounts.find((option) => option.id === id)
    return account ? `${account.name} — ${account.accountNumber || '—'}` : ''
  }

  return (
    <Dialog open modalType="modal" onOpenChange={(_, data) => { if (!data.open) close() }}>
      <DialogSurface className="part-dialog" aria-describedby="part-dialog-subtitle">
        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="part-dialog__body">
            <header className="part-dialog__header">
              <div>
                <DialogTitle>Receive Parts</DialogTitle>
                <p id="part-dialog-subtitle">Record incoming stock from a vendor</p>
              </div>
              <Button appearance="transparent" aria-label="Close receive parts form" icon={<Dismiss20Regular />} disabled={isSaving} onClick={close} />
            </header>

            <DialogContent className="part-dialog__content">
              {errors.length > 0 && (
                <MessageBar intent="error">
                  <MessageBarBody>
                    <ul className="part-dialog__errors">
                      {errors.map((error) => <li key={error}>{error}</li>)}
                    </ul>
                  </MessageBarBody>
                </MessageBar>
              )}

              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>
                    {saveError}
                    {receivedIds.size > 0 && ' The lines marked Received were saved; post again to receive the rest.'}
                  </MessageBarBody>
                </MessageBar>
              )}

              {receiveOptionsStatus === 'error' && (
                <MessageBar intent="warning">
                  <MessageBarBody>{receiveOptionsError}</MessageBarBody>
                  <MessageBarActions>
                    <Button size="small" onClick={retryOptions}>Retry</Button>
                  </MessageBarActions>
                </MessageBar>
              )}

              {vendorOptionsStatus === 'error' && (
                <MessageBar intent="warning">
                  <MessageBarBody>{vendorOptionsError}</MessageBarBody>
                  <MessageBarActions>
                    <Button size="small" onClick={retryVendors}>Retry</Button>
                  </MessageBarActions>
                </MessageBar>
              )}

              <fieldset className="part-dialog__section" disabled={isSaving}>
                <legend>Receipt Details</legend>
                <div className="part-dialog__grid">
                  <Field label="Vendor" required>
                    <Dropdown
                      value={vendorName}
                      selectedOptions={vendorId ? [vendorId] : []}
                      placeholder={isLoadingVendors ? 'Loading vendors…' : 'Select vendor…'}
                      // Locked once any line is received, so the saved lines and the vendor can't disagree
                      disabled={isLoadingVendors || vendorOptionsStatus === 'error' || receivedIds.size > 0}
                      onOptionSelect={(_, data) => { if (data.optionValue) selectVendor(data.optionValue) }}
                    >
                      {receiveVendors.map((option) => <Option key={option.id} value={option.id}>{option.name}</Option>)}
                    </Dropdown>
                  </Field>
                  <Field label="Receipt / PO #">
                    <Input value={refNumber} placeholder="e.g. PO-2024-0042" onChange={(_, data) => setRefNumber(data.value)} />
                  </Field>
                  <Field label="Receipt Date">
                    <Input type="date" value={date} onChange={(_, data) => setDate(data.value)} />
                  </Field>
                  <Field label="Payment">
                    <Dropdown
                      value={payMethod}
                      selectedOptions={[payMethod]}
                      onOptionSelect={(_, data) => { if (isPaymentMethod(data.optionValue)) setPayMethod(data.optionValue) }}
                    >
                      {PAYMENT_METHODS.map((method) => <Option key={method} value={method}>{method}</Option>)}
                    </Dropdown>
                  </Field>
                  {payMethod !== ON_ACCOUNT && (
                    <Field label="Pay From" className="part-dialog__wide">
                      <Dropdown
                        value={bankAccountLabel(effectiveBankId)}
                        selectedOptions={effectiveBankId ? [effectiveBankId] : []}
                        placeholder={isLoadingParts ? 'Loading bank accounts…' : 'No bank accounts'}
                        disabled={bankAccounts.length === 0}
                        onOptionSelect={(_, data) => { if (data.optionValue) setBankAccountId(data.optionValue) }}
                      >
                        {bankAccounts.map((account) => (
                          <Option key={account.id} value={account.id}>{bankAccountLabel(account.id)}</Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                </div>
                <p className="part-dialog__note">
                  Only the quantities are saved to inventory. Vendor, PO #, date and payment aren&apos;t stored by the API yet.
                </p>
              </fieldset>

              <fieldset className="part-dialog__section" disabled={isSaving}>
                {/* The legend names the group for screen readers; the visible title shares a row with Add Line,
                    which a legend can't do because browsers lay it out on the fieldset border */}
                <legend className="visually-hidden">Parts Received</legend>
                <div className="part-dialog__section-header">
                  <span className="part-dialog__section-title" aria-hidden="true">Parts Received</span>
                  <Button size="small" icon={<Add16Regular />} onClick={addLine}>Add Line</Button>
                </div>
                <div className="part-dialog__lines">
                  <Table aria-label="Parts received" className="data-table receive-lines-table">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell className="col-part">Part</TableHeaderCell>
                        <TableHeaderCell className="num col-qty">Qty</TableHeaderCell>
                        <TableHeaderCell className="num col-cost">Unit Cost</TableHeaderCell>
                        <TableHeaderCell className="num col-total">Total</TableHeaderCell>
                        <TableHeaderCell className="col-remove"><span className="visually-hidden">Remove</span></TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => {
                        const isReceived = receivedIds.has(line.partId)
                        const total = lineTotal(line)
                        return (
                          <TableRow key={line.key} className={isReceived ? 'is-received' : undefined}>
                            <TableCell>
                              <Dropdown
                                size="small"
                                aria-label={`Line ${index + 1} part`}
                                value={partLabel(findPart(line.partId))}
                                selectedOptions={line.partId ? [line.partId] : []}
                                placeholder={partPlaceholder()}
                                disabled={isReceived || !vendorId || isLoadingParts || receiveOptionsStatus === 'error' || vendorParts.length === 0}
                                onOptionSelect={(_, data) => { if (data.optionValue) selectLinePart(line.key, data.optionValue) }}
                              >
                                {vendorParts.map((part) => <Option key={part.id} value={part.id}>{partLabel(part)}</Option>)}
                              </Dropdown>
                            </TableCell>
                            <TableCell>
                              <Input
                                size="small"
                                type="number"
                                className="part-dialog__number"
                                aria-label={`Line ${index + 1} quantity`}
                                min={1}
                                step={1}
                                value={line.quantity}
                                disabled={isReceived}
                                onChange={(_, data) => setLine(line.key, { quantity: data.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                size="small"
                                type="number"
                                className="part-dialog__number"
                                aria-label={`Line ${index + 1} unit cost`}
                                contentBefore="$"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={line.unitCost}
                                // Always the part's cost price: UpdatePart can't store a different receipt cost
                                disabled
                              />
                            </TableCell>
                            <TableCell className="num">
                              {line.partId && Number.isFinite(total) && total > 0 ? formatPrice(total) : '—'}
                            </TableCell>
                            <TableCell>
                              {isReceived ? (
                                <span className="part-dialog__received">Received</span>
                              ) : lines.length > 1 && (
                                <Button
                                  size="small"
                                  appearance="subtle"
                                  aria-label={`Remove line ${index + 1}`}
                                  icon={<Dismiss16Regular />}
                                  onClick={() => removeLine(line.key)}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </fieldset>

              {validLines.length > 0 && (
                <dl className="part-dialog__totals">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="part-dialog__grand-total">
                    <dt>Total</dt>
                    <dd>{formatPrice(subtotal)}</dd>
                  </div>
                </dl>
              )}

              <JournalPreview title="Accounting Entry Preview" amount={subtotal} creditAccount={creditAccount} />
            </DialogContent>

            <DialogActions className="part-dialog__footer">
              <span className="part-dialog__footer-summary">
                {validLines.length > 0 ? `${units} units · ${formatPrice(subtotal)}` : 'No items added'}
              </span>
              <Button disabled={isSaving} onClick={close}>Cancel</Button>
              <Button type="submit" appearance="primary" disabled={isSaving} icon={isSaving ? <Spinner size="tiny" /> : undefined}>
                {isSaving ? 'Posting…' : 'Post Receipt'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}

// The design's dark "Accounting Entry" box: Parts Inventory debited, Accounts Payable or the bank credited
function JournalPreview({ title, amount, creditAccount }: { title: string; amount: number; creditAccount: string }) {
  const value = amount > 0 ? formatPrice(amount) : '—'
  return (
    <section className="part-dialog__journal" aria-label={title}>
      <h3>{title}</h3>
      <div>
        <span>Parts Inventory (Dr)</span>
        <span className={amount > 0 ? 'is-debit' : 'is-empty'}>{value}</span>
      </div>
      <div>
        <span>{creditAccount}</span>
        <span className={amount > 0 ? 'is-credit' : 'is-empty'}>{value}</span>
      </div>
    </section>
  )
}
