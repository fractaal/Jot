import { v4 as uuidv4 } from 'uuid'
import { normalizeTransactionInput } from '../../utils/transactions'
import { nowInTimezone } from '../../utils/time'
import type { Transaction } from '../../utils/memoryStore'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const store = getStore()
  const categories = getCategories()
  const timezone = getTimezone()

  const { value, errors } = normalizeTransactionInput(body, { timezone, categories })
  if (errors.length > 0) {
    throw createError({
      statusCode: 400,
      data: { error: 'Validation failed', details: errors },
    })
  }

  const nowIso = nowInTimezone(timezone).toISOString()
  const transaction: Transaction = {
    id: uuidv4(),
    ...value,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  await store.createTransaction(transaction)

  await maybeLearnRule({ store, body, transaction, nowIso })

  setResponseStatus(event, 201)
  return { transaction }
})

async function maybeLearnRule({
  store,
  body,
  transaction,
  nowIso,
}: {
  store: any
  body: Record<string, any>
  transaction: Transaction
  nowIso: string
}) {
  const quickAddMeta = body.quickAddMeta || body.quick_add_meta
  if (!quickAddMeta || !['nl', 'quick-add'].includes(transaction.source)) return

  const source = String(quickAddMeta.source || '').toLowerCase()
  const suggestedCategory = String(quickAddMeta.suggestedCategory || '').trim()
  if (source !== 'llm' || !suggestedCategory) return

  if (suggestedCategory === transaction.category) return

  const pattern = buildPattern({
    merchant: quickAddMeta.merchant || transaction.merchant,
    rawInput: quickAddMeta.originalText || quickAddMeta.rawInput || transaction.rawInput,
  })

  if (!pattern) return

  await store.upsertRule({
    pattern,
    category: transaction.category,
    createdAt: nowIso,
    updatedAt: nowIso,
  })
}

function buildPattern({ merchant, rawInput }: { merchant?: string; rawInput?: string }): string | null {
  const normalizedMerchant = String(merchant || '').trim().toLowerCase()
  if (normalizedMerchant && normalizedMerchant !== 'unknown') return normalizedMerchant

  const firstToken = String(rawInput || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => value.toLowerCase())
    .find((value) => /[a-z]/i.test(value))

  return firstToken || null
}
