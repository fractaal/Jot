import { ensureDayJs } from './time'

const SIMPLE_CATEGORY_HINTS = [
  { pattern: /(grab|angkas|joyride|taxi|lrt|mrt|bus|fuel|gas|parking|toll|ride)/i, category: 'Transportation' },
  { pattern: /(food|meal|dinner|lunch|breakfast|grabfood|restaurant|coffee|milk tea|snack|jollibee|starbucks)/i, category: 'Food & Dining' },
  { pattern: /(grocery|supermarket|palengke|hypermarket|landers)/i, category: 'Groceries' },
  { pattern: /(netflix|spotify|movie|cinema|game)/i, category: 'Entertainment' },
  { pattern: /(electric|water|internet|wifi|utility|meralco|maynilad|pldt|load|smart)/i, category: 'Utilities' },
  { pattern: /(medicine|clinic|hospital|dental|doctor|drug|watsons)/i, category: 'Health' },
  { pattern: /(tuition|book|course|class|school)/i, category: 'Education' },
  { pattern: /(flight|hotel|airbnb|travel|cebu pacific)/i, category: 'Travel' },
  { pattern: /(shop|uniqlo|mall|lazada|shopee|zalora|watsons|pet express)/i, category: 'Shopping' },
  { pattern: /(bill|rent|subscription|loan|insurance|fee)/i, category: 'Bills & Fees' },
  { pattern: /(salary|payroll|income|received)/i, category: 'Income' },
  { pattern: /(transfer|transferred)/i, category: 'Transfer' },
  { pattern: /(donate|donation)/i, category: 'Miscellaneous' },
]

function parseAmount(text: string): number | null {
  const lower = text.toLowerCase()

  const totalMatch = lower.match(/\btotal\s+([0-9]+(?:\.[0-9]+)?)/i)
  if (totalMatch) {
    return Number.parseFloat(totalMatch[1])
  }

  const splitBill = lower.match(/([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/)
  if (splitBill) {
    const numerator = Number.parseFloat(splitBill[1])
    const denominator = Number.parseFloat(splitBill[2])
    if (denominator > 0) return roundToTwo(numerator / denominator)
  }

  const kMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)\s*k\b/)
  if (kMatch) {
    return roundToTwo(Number.parseFloat(kMatch[1]) * 1000)
  }

  const amountRegex = /(?:₱|php|PHP|\$)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)(?:-ish)?/g
  let match
  let best: number | null = null

  while ((match = amountRegex.exec(text))) {
    const raw = match[1].replace(/,/g, '')
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed)) {
      if (best == null || parsed > best) {
        best = parsed
      }
    }
  }

  return best
}

function parseDate(text: string, tz = 'Asia/Manila'): string {
  const dayjs = ensureDayJs()
  const now = dayjs().tz(tz)
  const lower = text.toLowerCase()

  if (lower.includes('today') || lower.includes('this morning') || lower.includes('tonight')) return now.format('YYYY-MM-DD')
  if (lower.includes('yesterday') || lower.includes('last night') || lower.includes('kahapon')) return now.subtract(1, 'day').format('YYYY-MM-DD')
  if (lower.includes('tomorrow')) return now.add(1, 'day').format('YYYY-MM-DD')

  const weekday = parseWeekday(lower, now)
  if (weekday) return weekday

  const explicitFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'M/D/YYYY', 'MM/DD', 'M/D', 'MMM D', 'MMMM D']
  const tokens = text.split(/\s+/).filter(Boolean)

  for (let i = 0; i < tokens.length; i += 1) {
    for (let span = 1; span <= 3; span += 1) {
      const chunk = tokens.slice(i, i + span).join(' ')
      for (const format of explicitFormats) {
        const parsed = dayjs(chunk, format, true)
        if (parsed.isValid()) {
          if (format === 'MM/DD' || format === 'M/D' || format === 'MMM D' || format === 'MMMM D') {
            return parsed.year(now.year()).format('YYYY-MM-DD')
          }
          return parsed.format('YYYY-MM-DD')
        }
      }
    }
  }

  return now.format('YYYY-MM-DD')
}

function parseWeekday(lowerText: string, now: any): string | null {
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const lastPrefix = /last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
  const plain = /(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i

  const lastMatch = lowerText.match(lastPrefix)
  if (lastMatch) {
    const targetIndex = weekdays.indexOf(lastMatch[1].toLowerCase())
    return previousWeekday(now, targetIndex).format('YYYY-MM-DD')
  }

  const plainMatch = lowerText.match(plain)
  if (plainMatch) {
    const targetIndex = weekdays.indexOf(plainMatch[1].toLowerCase())
    return closestPastWeekday(now, targetIndex).format('YYYY-MM-DD')
  }

  return null
}

function previousWeekday(reference: any, targetIndex: number) {
  let cursor = reference.subtract(1, 'day')
  while (cursor.day() !== targetIndex) {
    cursor = cursor.subtract(1, 'day')
  }
  return cursor
}

function closestPastWeekday(reference: any, targetIndex: number) {
  let cursor = reference
  while (cursor.day() !== targetIndex) {
    cursor = cursor.subtract(1, 'day')
  }
  return cursor
}

function parseMerchantAndNotes(text: string, amount: number | null) {
  const cleaned = text
    .replace(/(?:₱|php|PHP|\$)?\s*[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?(?:-ish)?/g, ' ')
    .replace(/\b(today|yesterday|tomorrow|last night|this morning|spent|pay|paid|for|at|on|total|kahapon)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) {
    return {
      merchant: 'Unknown',
      notes: amount ? `Auto-parsed amount ${amount}` : '',
    }
  }

  const words = cleaned.split(' ').filter(Boolean)
  const merchant = words.slice(0, 2).join(' ') || 'Unknown'
  const notes = words.slice(2).join(' ')

  return { merchant, notes }
}

export function guessCategory(text: string, fallback = 'Miscellaneous'): string {
  for (const hint of SIMPLE_CATEGORY_HINTS) {
    if (hint.pattern.test(text)) return hint.category
  }
  return fallback
}

export function heuristicParse(text: string, tz = 'Asia/Manila') {
  const amount = parseAmount(text)
  const date = parseDate(text, tz)
  const { merchant, notes } = parseMerchantAndNotes(text, amount)

  return {
    amount,
    date,
    merchant,
    note: notes,
    currency: 'PHP',
    account: 'General',
  }
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}
