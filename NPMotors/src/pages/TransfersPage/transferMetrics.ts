import type { TransferAccountOption } from '../../types/transfers'

// Transfer amounts show cents, like the bank statement
export { formatAmount } from '../StatementLinesPage/statementLineMetrics'

// Today as YYYY-MM-DD in local time (toISOString would give tomorrow's date late in the evening west of UTC)
export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// "Chase Bank — Operating Checking", or just the account name when the bank is unknown
export const accountLabel = (account: TransferAccountOption) => (account.bankName ? `${account.bankName} — ${account.name}` : account.name)
