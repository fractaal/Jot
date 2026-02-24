import { heuristicParse, guessCategory } from './quickAddHeuristics'
import { nowInTimezone } from './time'
import type { Store, Rule } from './memoryStore'

export class QuickAddService {
  private store: Store
  private categories: string[]
  private timezone: string
  private llmParser: ((opts: { text: string; today: string; categories: string[]; timezone: string }) => Promise<Record<string, any>>) | null

  constructor({
    store,
    categories,
    timezone = 'Asia/Manila',
    llmParser = null,
  }: {
    store: Store
    categories: string[]
    timezone?: string
    llmParser?: ((opts: { text: string; today: string; categories: string[]; timezone: string }) => Promise<Record<string, any>>) | null
  }) {
    this.store = store
    this.categories = categories
    this.timezone = timezone
    this.llmParser = llmParser
  }

  async parse(inputText: string) {
    const text = String(inputText || '').trim()
    if (!text) {
      throw new Error('Input text is required')
    }

    const now = nowInTimezone(this.timezone)
    const heuristics = heuristicParse(text, this.timezone)

    const rules = await this.store.listRules()
    const matchedRule = findMatchingRule(rules, text)

    if (matchedRule) {
      return {
        transaction: normalizeResult(
          {
            ...heuristics,
            category: matchedRule.category,
          },
          this.categories,
          this.timezone,
        ),
        meta: {
          source: 'rule',
          suggestedCategory: matchedRule.category,
          matchedRulePattern: matchedRule.pattern,
          confidence: 1,
          needsReview: false,
        },
      }
    }

    let llmResult: Record<string, any> | null = null
    if (this.llmParser) {
      try {
        llmResult = await this.llmParser({
          text,
          today: now.format('YYYY-MM-DD'),
          categories: this.categories,
          timezone: this.timezone,
        })
      } catch {
        llmResult = null
      }
    }

    if (llmResult) {
      const normalized = normalizeResult(
        {
          ...heuristics,
          ...llmResult,
        },
        this.categories,
        this.timezone,
      )

      const confidence = clampConfidence(llmResult.confidence)
      const needsReview = Boolean(llmResult.needs_review ?? llmResult.needsReview)

      return {
        transaction: normalized,
        meta: {
          source: 'llm',
          suggestedCategory: normalized.category,
          matchedRulePattern: null,
          confidence,
          needsReview,
        },
      }
    }

    const fallbackCategory = guessCategory(
      text,
      this.categories.includes('Miscellaneous') ? 'Miscellaneous' : this.categories[0],
    )

    const fallback = normalizeResult(
      {
        ...heuristics,
        category: fallbackCategory,
      },
      this.categories,
      this.timezone,
    )

    return {
      transaction: fallback,
      meta: {
        source: 'fallback',
        suggestedCategory: fallbackCategory,
        matchedRulePattern: null,
        confidence: 0.45,
        needsReview: (fallback.amount as number) <= 0 || fallback.merchant === 'Unknown',
      },
    }
  }
}

export function findMatchingRule(rules: Rule[], text: string): Rule | undefined {
  const normalizedText = text.toLowerCase()
  const ordered = [...(rules || [])].sort(
    (a, b) => (b.pattern?.length || 0) - (a.pattern?.length || 0),
  )
  return ordered.find((rule) => {
    const pattern = String(rule.pattern || '').trim().toLowerCase()
    return Boolean(pattern) && normalizedText.includes(pattern)
  })
}

function clampConfidence(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0.8
  return Math.max(0, Math.min(1, num))
}

function normalizeResult(
  input: Record<string, any>,
  categories: string[],
  timezone: string,
) {
  const now = nowInTimezone(timezone)

  const amount = normalizeAmount(input.amount)
  const merchant = normalizeString(input.merchant) || 'Unknown'
  const note = normalizeString(input.note || input.notes)
  const currency = normalizeString(input.currency || 'PHP').toUpperCase()
  const account = normalizeString(input.account || 'General')

  let date = normalizeString(input.date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    date = now.format('YYYY-MM-DD')
  }

  let category = normalizeString(input.category)
  if (!category || !categories.includes(category)) {
    category = categoryMatchFromLooseInput(category, categories) || 'Miscellaneous'
    if (!categories.includes(category)) {
      category = categories[0]
    }
  }

  return {
    date,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    currency,
    account,
    category,
    merchant,
    note,
  }
}

function normalizeAmount(value: unknown): number {
  if (typeof value === 'number') return value
  const cleaned = String(value || '').replace(/,/g, '').trim()
  const num = Number.parseFloat(cleaned)
  return Number.isFinite(num) ? num : NaN
}

function normalizeString(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function categoryMatchFromLooseInput(inputCategory: string, categories: string[]): string | null {
  if (!inputCategory) return null
  const lower = inputCategory.toLowerCase()
  return (
    categories.find((c) => c.toLowerCase() === lower) ||
    categories.find((c) => c.toLowerCase().includes(lower)) ||
    null
  )
}
