export default defineEventHandler(() => {
  const timezone = getTimezone()
  return { ok: true, timezone }
})
