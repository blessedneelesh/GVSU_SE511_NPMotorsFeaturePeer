import { useCallback, useState } from 'react'
import { useReceiptMutations } from '../../hooks/useReceiptMutations'
import type { ReceiptTarget } from '../../types/receipts'

export interface UseReceivePaymentDialogResult {
  // The invoice being paid, or null while the dialog is closed
  receiving: ReceiptTarget | null
  openReceive: (invoice: ReceiptTarget) => void
  closeReceive: () => void
}

// Which invoice the Receive Payment dialog is open for (UI-only state; the save status lives in Redux).
// The invoice is copied when the dialog opens: the list and detail refetch after a payment, and the
// confirmation must keep showing the balance the payment was taken against.
export function useReceivePaymentDialog(): UseReceivePaymentDialogResult {
  const { resetSave } = useReceiptMutations()
  const [receiving, setReceiving] = useState<ReceiptTarget | null>(null)

  const openReceive = useCallback((invoice: ReceiptTarget) => {
    resetSave()
    setReceiving({
      id: invoice.id,
      number: invoice.number,
      customerName: invoice.customerName,
      amount: invoice.amount,
      paid: invoice.paid,
      balance: invoice.balance,
      agingStatus: invoice.agingStatus,
    })
  }, [resetSave])

  const closeReceive = useCallback(() => {
    resetSave()
    setReceiving(null)
  }, [resetSave])

  return { receiving, openReceive, closeReceive }
}
