import { ensureDayJs } from './time'

function normalizeString(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function normalizeAmount(value: unknown): number {
  if (typeof value === 'number') return value
  const normalized = String(value || '').replace(/,/g, '').trim()
  const num = Number.parseFloat(normalized)
  return Number.isFinite(num) ? num : NaN
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const dayjs = ensureDayJs()
  return dayjs(value, 'YYYY-MM-DD', true).isValid()
}

export function normalizeTransactionInput(
  payload: Record<string, any>,
  { timezone = 'Asia/Manila', categories = [] as string[] } = {},
) {
  const dayjs = ensureDayJs()
  const now = dayjs().tz(timezone)

  const date = normalizeString(payload.date) || now.format('YYYY-MM-DD')
  const amount = normalizeAmount(payload.amount)
  const currency = normalizeString(payload.currency || 'PHP').toUpperCase()
  const category = normalizeString(payload.category)
  const merchant = normalizeString(payload.merchant)
  const account = normalizeString(payload.account || 'General')
  const note = normalizeString(payload.note || payload.notes)
  const source = normalizeString(payload.source || 'manual').toLowerCase()
  const rawInput = normalizeString(
    payload.rawInput || payload.raw_input || payload.originalText || payload.original_text,
  )

  const errors: string[] = []

  if (!isIsoDate(date)) errors.push('date must be YYYY-MM-DD')
  if (!Number.isFinite(amount) || amount <= 0) errors.push('amount must be a positive number')
  if (!currency) errors.push('currency is required')
  if (!category) errors.push('category is required')
  if (categories.length > 0 && !categories.includes(category)) {
    errors.push(`category must be one of: ${categories.join(', ')}`)
  }
  if (!merchant) errors.push('merchant is required')
  if (!account) errors.push('account is required')
  if (!['manual', 'nl', 'quick-add'].includes(source)) errors.push('source must be manual or nl')

  return {
    value: {
      date,
      amount,
      currency,
      category,
      merchant,
      account,
      note,
      source: source === 'quick-add' ? 'nl' : source,
      rawInput,
    },
    errors,
  }
}

export function sortTransactionsNewestFirst<T extends Record<string, any>>(transactions: T[]): T[] {
  return [...transactions].sort((a, b) => {
    const aDate = `${a.date || ''}T${a.updatedAt || a.createdAt || ''}`
    const bDate = `${b.date || ''}T${b.updatedAt || b.createdAt || ''}`
    return bDate.localeCompare(aDate)
  })
}
