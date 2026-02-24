import { existsSync } from 'fs'
import { resolve } from 'path'
import { GoogleSheetsStore } from './googleSheetsStore'
import { QuickAddService } from './quickAddService'
import { createOpenAiParser } from './openAiParser'
import { DEFAULT_CATEGORIES } from './constants'
import type { Store } from './memoryStore'

let _store: Store | null = null
let _quickAddService: QuickAddService | null = null
let _categories: string[] | null = null
let _timezone: string | null = null

function parseCategories(raw: string): string[] {
  if (!raw) return DEFAULT_CATEGORIES
  const list = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  if (list.length === 0) return DEFAULT_CATEGORIES
  if (!list.includes('Miscellaneous')) list.push('Miscellaneous')
  return list
}

function resolveCredentials(config: Record<string, string>): Record<string, any> | null {
  if (config.googleServiceAccountJson) {
    return JSON.parse(config.googleServiceAccountJson)
  }

  if (config.googleServiceAccountJsonB64) {
    const decoded = Buffer.from(config.googleServiceAccountJsonB64, 'base64').toString('utf8')
    return JSON.parse(decoded)
  }

  if (config.googleServiceAccountEmail && config.googlePrivateKey) {
    return {
      type: 'service_account',
      client_email: config.googleServiceAccountEmail,
      private_key: config.googlePrivateKey.replace(/\\n/g, '\n'),
    }
  }

  return null
}

function resolveKeyFile(configured: string): string | null {
  if (!configured) return null
  const resolved = resolve(configured)
  if (!existsSync(resolved)) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY_FILE does not exist: ${resolved}`)
  }
  return resolved
}

export function getStore(): Store {
  if (_store) return _store

  const config = useRuntimeConfig()

  const spreadsheetId = config.googleSheetId
  const credentials = resolveCredentials(config as unknown as Record<string, string>)
  const keyFile = resolveKeyFile(config.googleServiceAccountKeyFile)

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID (or GOOGLE_SHEETS_SPREADSHEET_ID) is required')
  }

  if (!credentials && !keyFile) {
    throw new Error(
      'Provide GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON_B64, or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY',
    )
  }

  _store = new GoogleSheetsStore({ spreadsheetId, credentials, keyFile })
  return _store
}

export function getCategories(): string[] {
  if (_categories) return _categories
  const config = useRuntimeConfig()
  _categories = parseCategories(config.categories)
  return _categories
}

export function getTimezone(): string {
  if (_timezone) return _timezone
  const config = useRuntimeConfig()
  _timezone = config.appTimezone || 'Asia/Manila'
  return _timezone
}

export function getQuickAddService(): QuickAddService {
  if (_quickAddService) return _quickAddService

  const config = useRuntimeConfig()
  const store = getStore()
  const categories = getCategories()
  const timezone = getTimezone()

  const llmParser = config.openaiApiKey
    ? createOpenAiParser({
        apiKey: config.openaiApiKey,
        model: config.openaiModel || 'gpt-4o-mini',
      })
    : null

  _quickAddService = new QuickAddService({
    store,
    categories,
    timezone,
    llmParser,
  })

  return _quickAddService
}
