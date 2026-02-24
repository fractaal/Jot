export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  const spreadsheetId = config.googleSheetId
  if (!spreadsheetId) {
    return { url: null }
  }
  return { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` }
})
