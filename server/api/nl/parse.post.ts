export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const text = String(body?.text || '').trim()

  if (!text) {
    throw createError({ statusCode: 400, data: { error: 'text is required' } })
  }

  const quickAddService = getQuickAddService()
  const result = await quickAddService.parse(text)

  return { ...result, text }
})
