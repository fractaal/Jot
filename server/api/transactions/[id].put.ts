import { normalizeTransactionInput } from '../../utils/transactions'
import { nowInTimezone } from '../../utils/time'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const store = getStore()
  const categories = getCategories()
  const timezone = getTimezone()

  const transactions = await store.listTransactions()
  const existing = transactions.find((tx) => tx.id === id)
  if (!existing) {
    throw createError({ statusCode: 404, data: { error: 'Transaction not found' } })
  }

  const mergedPayload = { ...existing, ...body }
  const { value, errors } = normalizeTransactionInput(mergedPayload, { timezone, categories })
  if (errors.length > 0) {
    throw createError({
      statusCode: 400,
      data: { error: 'Validation failed', details: errors },
    })
  }

  const updated = await store.updateTransaction(id, {
    ...value,
    updatedAt: nowInTimezone(timezone).toISOString(),
  })

  return { transaction: stripInternalFields(updated) }
})

function stripInternalFields(transaction: Record<string, any> | null) {
  if (!transaction) return transaction
  const { _rowNumber, ...rest } = transaction
  return rest
}
