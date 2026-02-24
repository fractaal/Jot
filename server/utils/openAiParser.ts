import OpenAI from 'openai'

function safeJsonParse(value: string): Record<string, any> | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function createOpenAiParser({ apiKey, model = 'gpt-4o-mini' }: { apiKey: string; model?: string }) {
  const client = new OpenAI({ apiKey })

  return async function parseWithLlm({
    text,
    today,
    categories,
    timezone,
  }: {
    text: string
    today: string
    categories: string[]
    timezone: string
  }) {
    const systemPrompt = [
      'You extract one financial transaction from casual user text.',
      'Return strict JSON only with keys: amount, currency, merchant, date, category, note, confidence, needs_review, account.',
      'Rules:',
      '- date must be YYYY-MM-DD and interpreted in timezone provided.',
      '- amount must be a positive number.',
      '- currency should default to PHP unless explicitly different.',
      '- account should default to General if unknown.',
      `- category must be one of: ${categories.join(', ')}.`,
      '- confidence between 0 and 1.',
      '- needs_review must be true for ambiguous amount/date, transfer, refund, or income-like intents.',
      '- If uncertain, still provide best guess and lower confidence.',
      '- Do not include markdown fences.',
    ].join('\n')

    const userPrompt = [
      `Timezone: ${timezone}`,
      `Today: ${today}`,
      `Input: ${text}`,
    ].join('\n')

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = completion.choices?.[0]?.message?.content || '{}'
    const parsed = safeJsonParse(raw)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON from LLM parser')
    }

    return parsed
  }
}
