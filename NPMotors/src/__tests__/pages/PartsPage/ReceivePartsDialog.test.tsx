import { act, screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReceivePartsDialog } from '../../../pages/PartsPage/ReceivePartsDialog'
import {
  loadPartReceiveOptions,
  loadPartReceiveOptionsFailure,
  loadPartReceiveOptionsSuccess,
  loadPartVendorOptionsFailure,
  loadPartVendorOptionsSuccess,
  receiveParts,
  receivePartsFailure,
  receivePartsSuccess,
} from '../../../redux/parts/parts.actions'
import { PART_ACTIONS } from '../../../redux/parts/parts.constants'
import type { PartsState } from '../../../redux/parts/parts.reducer'
import { padsReceiveLine, part, partReceiveLines, partReceiveOptions, partVendorOptions, rotorsReceiveLine } from '../../../test/fixtures/parts'
import { makePartState, renderWithProviders } from '../../../test/test-utils'

// The dialog loads the vendors and the receive options (parts + bank accounts) on mount. Without a saga
// nothing answers them, so the helper dispatches both, as the saga would. The dialog renders in a portal,
// so every query goes through screen.
function renderDialog(overrides: Partial<PartsState> = {}, { options = true } = {}) {
  const onClose = vi.fn()
  const onDone = vi.fn()
  const result = renderWithProviders(<ReceivePartsDialog onClose={onClose} onDone={onDone} />, {
    preloadedState: makePartState(overrides),
  })
  if (options) {
    act(() => {
      result.store.dispatch(loadPartVendorOptionsSuccess(partVendorOptions))
      result.store.dispatch(loadPartReceiveOptionsSuccess(partReceiveOptions))
    })
  }
  return { ...result, onClose, onDone }
}

// Same local YYYY-MM-DD the dialog uses for its default receipt date
const today = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const combobox = (name: string | RegExp) => screen.getByRole('combobox', { name })
// type="number" inputs have the spinbutton role
const numberField = (name: string) => screen.getByRole('spinbutton', { name })
const linePart = (line: number) => combobox(`Line ${line} part`)
const lineQuantity = (line: number) => numberField(`Line ${line} quantity`)
const lineCost = (line: number) => numberField(`Line ${line} unit cost`)

async function choose(user: UserEvent, box: HTMLElement, option: string) {
  await user.click(box)
  await user.click(screen.getByRole('option', { name: option }))
}

async function replace(user: UserEvent, input: HTMLElement, value: string) {
  await user.clear(input)
  if (value) await user.type(input, value)
}

// 5 brake pad sets ($38.50) and 2 rotors ($72.00) from Great Lakes Auto Parts: $336.50 in all
async function fillReceipt(user: UserEvent) {
  await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')
  await choose(user, linePart(1), 'Front Brake Pad Set (BRK-1001)')
  await replace(user, lineQuantity(1), '5')
  await user.click(screen.getByRole('button', { name: 'Add Line' }))
  await choose(user, linePart(2), 'Brake Rotor (BRK-1003)')
  await replace(user, lineQuantity(2), '2')
}

const submit = () => screen.getByRole('button', { name: 'Post Receipt' })

// The mount-time lookups are always recorded; these tests care about what the form posts
const receipts = (actions: { type: string }[]) => actions.filter((action) => action.type === PART_ACTIONS.RECEIVE)

// The design's dark Dr/Cr box; returns the amount next to an account label
const journalAmount = (title: string, account: string) =>
  within(screen.getByRole('region', { name: title })).getByText(account).nextElementSibling

describe('ReceivePartsDialog', () => {
  it('renders the title, both sections and the defaults', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Receive Parts' })).toBeInTheDocument()
    expect(screen.getByText('Record incoming stock from a vendor')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Receipt Details' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Parts Received' })).toBeInTheDocument()
    expect(combobox(/^Vendor/)).toHaveTextContent('Select vendor…')
    expect(screen.getByLabelText('Receipt Date')).toHaveValue(today())
    expect(combobox('Payment')).toHaveTextContent('On Account (AP)')
    expect(lineQuantity(1)).toHaveValue(1)
    expect(screen.getByText('No items added')).toBeInTheDocument()
    expect(journalAmount('Accounting Entry Preview', 'Accounts Payable (Cr)')).toHaveTextContent('—')
    expect(screen.queryByRole('combobox', { name: 'Pay From' })).not.toBeInTheDocument()
  })

  it('says which receipt details the API does not store', () => {
    renderDialog()
    expect(screen.getByText(/Only the quantities are saved to inventory/)).toBeInTheDocument()
  })

  it('loads the receive options on mount', () => {
    const { actions } = renderDialog({}, { options: false })
    expect(actions).toContainEqual(loadPartReceiveOptions())
  })

  describe('vendor and part dropdowns', () => {
    it('offers only parts vendors', async () => {
      const { user } = renderDialog()
      await user.click(combobox(/^Vendor/))
      expect(screen.getAllByRole('option').map((option) => option.textContent))
        .toEqual(['Great Lakes Auto Parts', 'Lakeshore Tire & Wheel'])
    })

    it('disables the part dropdown until a vendor is selected', () => {
      renderDialog()
      expect(linePart(1)).toBeDisabled()
      expect(linePart(1)).toHaveTextContent('Select a vendor first')
    })

    it('offers only the parts of the selected vendor', async () => {
      const { user } = renderDialog()
      await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')

      expect(linePart(1)).toBeEnabled()
      await user.click(linePart(1))
      expect(screen.getAllByRole('option').map((option) => option.textContent))
        .toEqual(['Front Brake Pad Set (BRK-1001)', 'Brake Rotor (BRK-1003)'])
    })

    it('clears the picked parts when the vendor changes', async () => {
      const { user } = renderDialog()
      await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')
      await choose(user, linePart(1), 'Front Brake Pad Set (BRK-1001)')
      await replace(user, lineQuantity(1), '4')

      await choose(user, combobox(/^Vendor/), 'Lakeshore Tire & Wheel')
      expect(linePart(1)).toHaveTextContent('Select part…')
      expect(lineCost(1)).toHaveValue(null)
      expect(lineQuantity(1)).toHaveValue(4)
      await user.click(linePart(1))
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Oil Filter (OIL-2002)'])
    })

    it('says when the vendor has no parts', async () => {
      const { store, user } = renderDialog({}, { options: false })
      act(() => {
        // The vehicles vendor isn't offered, so give a parts vendor that owns none of the loaded parts
        store.dispatch(loadPartVendorOptionsSuccess([{ id: '99', name: 'Empty Parts Co', type: 'parts' }]))
        store.dispatch(loadPartReceiveOptionsSuccess(partReceiveOptions))
      })
      await choose(user, combobox(/^Vendor/), 'Empty Parts Co')
      expect(linePart(1)).toBeDisabled()
      expect(linePart(1)).toHaveTextContent('No parts from this vendor')
    })
  })

  it('keeps the unit cost read-only', async () => {
    const { user } = renderDialog()
    expect(lineCost(1)).toBeDisabled()
    await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')
    await choose(user, linePart(1), 'Front Brake Pad Set (BRK-1001)')
    expect(lineCost(1)).toBeDisabled()
  })

  it('fills the unit cost from the part and totals the lines', async () => {
    const { user } = renderDialog()
    await fillReceipt(user)

    expect(lineCost(1)).toHaveValue(38.5)
    expect(lineCost(2)).toHaveValue(72)
    expect(screen.getByText('$192.50')).toBeInTheDocument()
    expect(screen.getByText('$144.00')).toBeInTheDocument()
    expect(screen.getByText('Subtotal').nextElementSibling).toHaveTextContent('$336.50')
    expect(screen.getByText('7 units · $336.50')).toBeInTheDocument()
    expect(journalAmount('Accounting Entry Preview', 'Parts Inventory (Dr)')).toHaveTextContent('$336.50')
    expect(journalAmount('Accounting Entry Preview', 'Accounts Payable (Cr)')).toHaveTextContent('$336.50')
  })

  it('shows Pay From with the first bank account and credits the bank for a bank transfer', async () => {
    const { user } = renderDialog()
    await choose(user, combobox('Payment'), 'Bank Transfer')

    expect(combobox('Pay From')).toHaveTextContent('Operating Checking — ********0001')
    await user.click(combobox('Pay From'))
    expect(screen.getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Operating Checking — ********0001', 'Parts Reserve — ********0002'])
    await user.click(screen.getByRole('option', { name: 'Parts Reserve — ********0002' }))
    expect(combobox('Pay From')).toHaveTextContent('Parts Reserve — ********0002')
    expect(screen.getByText('Bank Account (Cr)')).toBeInTheDocument()
  })

  it('adds and removes lines', async () => {
    const { user } = renderDialog()
    expect(screen.queryByRole('button', { name: 'Remove line 1' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Line' }))
    expect(linePart(2)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove line 2' }))
    expect(screen.queryByRole('combobox', { name: 'Line 2 part' })).not.toBeInTheDocument()
  })

  describe('validation', () => {
    it('requires a vendor and at least one valid line', async () => {
      const { actions, user } = renderDialog()
      await user.click(submit())

      expect(screen.getByText('Select a vendor')).toBeInTheDocument()
      expect(screen.getByText('Add at least one valid line item')).toBeInTheDocument()
      expect(receipts(actions)).toHaveLength(0)
    })

    it.each(['0', '2.5'])('rejects a quantity of %s', async (quantity) => {
      const { actions, user } = renderDialog()
      await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')
      await choose(user, linePart(1), 'Front Brake Pad Set (BRK-1001)')
      await replace(user, lineQuantity(1), quantity)
      await user.click(submit())

      expect(screen.getByText('Line 1: quantity must be a whole number greater than 0')).toBeInTheDocument()
      expect(receipts(actions)).toHaveLength(0)
    })

    // The unit cost can't be edited, so a part without a cost price must not block the receipt
    it('accepts a part whose cost price is zero', async () => {
      const { store, actions, user } = renderDialog({}, { options: false })
      act(() => {
        store.dispatch(loadPartVendorOptionsSuccess(partVendorOptions))
        store.dispatch(loadPartReceiveOptionsSuccess({ ...partReceiveOptions, parts: [{ ...part, costPrice: 0 }] }))
      })
      await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')
      await choose(user, linePart(1), 'Front Brake Pad Set (BRK-1001)')
      expect(lineCost(1)).toHaveValue(0)
      await user.click(submit())

      expect(receipts(actions)).toEqual([receiveParts([{ partId: '1', quantity: 1 }])])
    })

    it('rejects the same part on two lines', async () => {
      const { actions, user } = renderDialog()
      await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')
      await choose(user, linePart(1), 'Front Brake Pad Set (BRK-1001)')
      await user.click(screen.getByRole('button', { name: 'Add Line' }))
      await choose(user, linePart(2), 'Front Brake Pad Set (BRK-1001)')
      await user.click(submit())

      expect(screen.getByText('Line 2: this part is already on line 1')).toBeInTheDocument()
      expect(receipts(actions)).toHaveLength(0)
    })

    it('clears the errors once the form is edited', async () => {
      const { user } = renderDialog()
      await user.click(submit())
      await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')
      expect(screen.queryByText('Select a vendor')).not.toBeInTheDocument()
    })
  })

  it('posts every line as a part id and quantity', async () => {
    const { actions, user } = renderDialog()
    await fillReceipt(user)
    await user.click(submit())

    expect(receipts(actions)).toEqual([receiveParts(partReceiveLines)])
  })

  it('disables the form and shows Posting… while the receipt is posting', () => {
    renderDialog({ saveStatus: 'loading' })
    expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Receipt Details' })).toBeDisabled()
  })

  describe('after a partial failure', () => {
    async function failAfterFirstLine() {
      const rendered = renderDialog()
      await fillReceipt(rendered.user)
      await rendered.user.click(submit())
      act(() => { rendered.store.dispatch(receivePartsFailure({ message: 'This part no longer exists.', received: [padsReceiveLine] })) })
      return rendered
    }

    it('shows the error, marks the saved line Received and locks it and the vendor', async () => {
      await failAfterFirstLine()

      expect(screen.getByText(/This part no longer exists\. The lines marked Received were saved/)).toBeInTheDocument()
      expect(screen.getByText('Received')).toBeInTheDocument()
      expect(linePart(1)).toBeDisabled()
      expect(lineQuantity(1)).toBeDisabled()
      expect(lineCost(1)).toBeDisabled()
      expect(linePart(2)).toBeEnabled()
      expect(combobox(/^Vendor/)).toBeDisabled()
    })

    it('posts only the remaining lines on retry', async () => {
      const { actions, user } = await failAfterFirstLine()
      await user.click(submit())

      expect(receipts(actions)).toEqual([receiveParts(partReceiveLines), receiveParts([rotorsReceiveLine])])
    })

    it('reports the received part when the dialog is closed', async () => {
      const { onClose, onDone, user } = await failAfterFirstLine()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onDone).toHaveBeenCalledWith(['1'])
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('after the receipt is posted', () => {
    async function post() {
      const rendered = renderDialog()
      await fillReceipt(rendered.user)
      await rendered.user.click(submit())
      act(() => { rendered.store.dispatch(receivePartsSuccess(partReceiveLines)) })
      return rendered
    }

    it('shows the design summary with the lines, total and accounting entry', async () => {
      await post()

      expect(screen.getByRole('heading', { name: 'Parts Received' })).toBeInTheDocument()
      expect(screen.getByText(/7 units received · Total cost/)).toHaveTextContent('7 units received · Total cost $336.50')
      expect(screen.getByText('Front Brake Pad Set × 5').nextElementSibling).toHaveTextContent('$192.50')
      expect(screen.getByText('Brake Rotor × 2').nextElementSibling).toHaveTextContent('$144.00')
      expect(journalAmount('Accounting Entry', 'Parts Inventory (Dr)')).toHaveTextContent('$336.50')
      expect(screen.queryByRole('button', { name: 'Post Receipt' })).not.toBeInTheDocument()
    })

    it('reports the received parts on Done', async () => {
      const { onClose, onDone, user } = await post()
      await user.click(screen.getByRole('button', { name: 'Done' }))

      expect(onDone).toHaveBeenCalledWith(['1', '3'])
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('calls onClose on Cancel when nothing was received', async () => {
    const { onClose, onDone, user } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()
  })

  it('shows a receive-options error with Retry and disables the part dropdown', async () => {
    const { store, actions, user } = renderDialog({}, { options: false })
    act(() => {
      store.dispatch(loadPartVendorOptionsSuccess(partVendorOptions))
      store.dispatch(loadPartReceiveOptionsFailure('Parts and bank accounts could not be loaded. Please try again.'))
    })
    await choose(user, combobox(/^Vendor/), 'Great Lakes Auto Parts')

    expect(screen.getByText('Parts and bank accounts could not be loaded. Please try again.')).toBeInTheDocument()
    expect(linePart(1)).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(actions.filter((action) => action.type === PART_ACTIONS.LOAD_RECEIVE_OPTIONS)).toHaveLength(2)
  })

  it('shows a vendor error and disables the vendor dropdown', () => {
    const { store } = renderDialog({}, { options: false })
    act(() => { store.dispatch(loadPartVendorOptionsFailure('Vendors could not be loaded. Please try again.')) })

    expect(screen.getByText('Vendors could not be loaded. Please try again.')).toBeInTheDocument()
    expect(combobox(/^Vendor/)).toBeDisabled()
  })
})
