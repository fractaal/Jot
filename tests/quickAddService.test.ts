import { describe, it, expect, vi } from 'vitest'
import { QuickAddService } from '../server/utils/quickAddService'
import { MemoryStore } from '../server/utils/memoryStore'
import type { Rule } from '../server/utils/memoryStore'

const categories = ['Food & Dining', 'Transportation', 'Groceries', 'Shopping', 'Miscellaneous']

describe('QuickAddService', () => {
  it('applies learned rule before LLM', async () => {
    const store = new MemoryStore({
      seedRules: [
        {
          id: 'rule-1',
          pattern: 'grabfood',
          category: 'Food & Dining',
          hits: 0,
          lastUsedAt: '',
          createdAt: '2026-01-01T00:00:00.000Z',
        } as Rule,
      ],
    })

    const llmParser = vi.fn()

    const service = new QuickAddService({
      store,
      categories,
      timezone: 'Asia/Manila',
      llmParser,
    })

    const result = await service.parse('GrabFood 300 dinner yesterday')

    expect(result.meta.source).toBe('rule')
    expect(result.transaction.category).toBe('Food & Dining')
    expect(llmParser).not.toHaveBeenCalled()
  })

  it('uses llm when no rules match', async () => {
    const store = new MemoryStore()
    const llmParser = vi.fn(async () => ({
      amount: 430,
      date: '2026-02-24',
      merchant: 'Uniqlo',
      category: 'Shopping',
      note: 'socks',
      currency: 'PHP',
      account: 'Card',
      confidence: 0.86,
      needs_review: false,
    }))

    const service = new QuickAddService({
      store,
      categories,
      timezone: 'Asia/Manila',
      llmParser,
    })

    const result = await service.parse('Spent 430 at Uniqlo for socks yesterday')

    expect(result.meta.source).toBe('llm')
    expect(result.transaction.category).toBe('Shopping')
    expect(result.transaction.merchant).toBe('Uniqlo')
    expect(result.transaction.currency).toBe('PHP')
  })

  it('falls back to heuristics when llm fails', async () => {
    const store = new MemoryStore()
    const llmParser = vi.fn(async () => {
      throw new Error('LLM unavailable')
    })

    const service = new QuickAddService({
      store,
      categories,
      timezone: 'Asia/Manila',
      llmParser,
    })

    const result = await service.parse('Grab taxi 150 today')

    expect(result.meta.source).toBe('fallback')
    expect(result.transaction.category).toBe('Transportation')
    expect(result.transaction.amount).toBe(150)
  })
})
