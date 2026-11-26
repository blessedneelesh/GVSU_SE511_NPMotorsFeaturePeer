import { useCallback, useState } from 'react'
import { usePayableMutations } from '../../hooks/usePayableMutations'
import type { VendorPaymentTarget } from '../../types/payables'

export interface UseMakePaymentDialogResult {
  // The bill being paid, or null while the dialog is closed
  paying: VendorPaymentTarget | null
  openPay: (bill: VendorPaymentTarget) => void
  closePay: () => void
}

// Which bill the Make Payment dialog is open for (UI-only state; the save status lives in Redux).
// The bill is copied when the dialog opens: the list and detail refetch after a payment, and the
// confirmation must keep showing the balance the payment was made against.
export function useMakePaymentDialog(): UseMakePaymentDialogResult {
  const { resetSave } = usePayableMutations()
  const [paying, setPaying] = useState<VendorPaymentTarget | null>(null)

  const openPay = useCallback((bill: VendorPaymentTarget) => {
    resetSave()
    setPaying({
      id: bill.id,
      number: bill.number,
      vendorName: bill.vendorName,
      amount: bill.amount,
      paid: bill.paid,
      balance: bill.balance,
    })
  }, [resetSave])

  const closePay = useCallback(() => {
    resetSave()
    setPaying(null)
  }, [resetSave])

  return { paying, openPay, closePay }
}
