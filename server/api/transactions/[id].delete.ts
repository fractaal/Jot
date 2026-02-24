export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const store = getStore()

  const ok = await store.deleteTransaction(id)
  if (!ok) {
    throw createError({ statusCode: 404, data: { error: 'Transaction not found' } })
  }

  return { ok: true }
})
