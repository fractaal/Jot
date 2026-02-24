import { sortTransactionsNewestFirst } from '../utils/transactions'
import { nowInTimezone } from '../utils/time'

const NON_EXPENSE_CATEGORIES = new Set(['income', 'transfer'])

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const store = getStore()
  const timezone = getTimezone()

  const month = String(query.month || '').trim() || nowInTimezone(timezone).format('YYYY-MM')
  const transactions = await store.listTransactions()
  const monthTransactions = transactions.filter((tx) => String(tx.date || '').startsWith(month))

  const currentMonthExpenses = monthTransactions.filter(
    (tx) => !NON_EXPENSE_CATEGORIES.has(String(tx.category || '').toLowerCase()),
  )
  const currentMonthTotal = sumAmounts(currentMonthExpenses)

  const categoryBreakdown = Object.entries(
    currentMonthExpenses.reduce((acc: Record<string, number>, tx) => {
      const key = tx.category || 'Miscellaneous'
      const value = Number(tx.amount) || 0
      acc[key] = (acc[key] || 0) + value
      return acc
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total }))

  const recentTransactions = sortTransactionsNewestFirst(transactions)
    .slice(0, 10)
    .map(stripInternalFields)

  return {
    month,
    currentMonthTotal,
    categoryBreakdown,
    recentTransactions,
  }
})

function sumAmounts(transactions: Array<{ amount: number }>) {
  return transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
}

function stripInternalFields(transaction: Record<string, any>) {
  if (!transaction) return transaction
  const { _rowNumber, ...rest } = transaction
  return rest
}
