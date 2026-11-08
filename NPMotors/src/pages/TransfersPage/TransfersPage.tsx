import { useEffect } from 'react'
import { Button, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle } from '@fluentui/react-components'
import { useTransferMutations } from '../../hooks/useTransferMutations'
import { TransferForm } from './TransferForm'
import './TransfersPage.css'

// How long the "Transfer posted" banner stays up
const SAVED_BANNER_MS = 4000

export function TransfersPage() {
  const { saveStatus, resetSave } = useTransferMutations()

  // Start with a clean save status, and don't leave one behind for the next visit
  useEffect(() => {
    resetSave()
    return resetSave
  }, [resetSave])

  const isSaved = saveStatus === 'success'
  useEffect(() => {
    if (!isSaved) return
    const timer = window.setTimeout(resetSave, SAVED_BANNER_MS)
    return () => window.clearTimeout(timer)
  }, [isSaved, resetSave])

  return (
    <div className="transfers-page">
      <header className="transfers-header">
        <div>
          <h1>Bank Transfers</h1>
          <p>Move funds between active accounts</p>
        </div>
        <div className="transfers-header__note">One transfer posts two linked transactions</div>
      </header>

      {isSaved && (
        <MessageBar intent="success" className="transfers-message">
          <MessageBarBody>
            <MessageBarTitle>Transfer posted</MessageBarTitle>
            The account balances have been updated.
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={resetSave}>Dismiss</Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <TransferForm />
    </div>
  )
}
