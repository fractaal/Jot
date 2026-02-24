import { sortTransactionsNewestFirst } from '../../utils/transactions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const month = String(query.month || '').trim()
  const category = String(query.category || '').trim()
  const q = String(query.q || '').trim().toLowerCase()

  const store = getStore()
  let transactions = await store.listTransactions()

  if (month) {
    transactions = transactions.filter((tx) => String(tx.date || '').startsWith(month))
  }

  if (category) {
    transactions = transactions.filter((tx) => tx.category === category)
  }

  if (q) {
    transactions = transactions.filter((tx) => {
      const haystack = `${tx.merchant} ${tx.note} ${tx.category} ${tx.rawInput}`.toLowerCase()
      return haystack.includes(q)
    })
  }

  return {
    transactions: sortTransactionsNewestFirst(transactions).map(stripInternalFields),
  }
})

function stripInternalFields(transaction: Record<string, any>) {
  if (!transaction) return transaction
  const { _rowNumber, ...rest } = transaction
  return rest
}
