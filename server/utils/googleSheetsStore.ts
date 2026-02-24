import { google } from 'googleapis'
import { v4 as uuidv4 } from 'uuid'
import { TRANSACTIONS_HEADERS, RULES_HEADERS } from './constants'
import type { Store, Transaction, Rule } from './memoryStore'

interface GoogleSheetsStoreOptions {
  spreadsheetId: string
  credentials?: Record<string, any> | null
  keyFile?: string | null
  transactionsTab?: string
  rulesTab?: string
}

export class GoogleSheetsStore implements Store {
  private spreadsheetId: string
  private credentials: Record<string, any> | null
  private keyFile: string | null
  private transactionsTab: string
  private rulesTab: string
  private ready = false
  private sheets: any = null

  constructor({
    spreadsheetId,
    credentials = null,
    keyFile = null,
    transactionsTab = 'Transactions',
    rulesTab = 'Rules',
  }: GoogleSheetsStoreOptions) {
    this.spreadsheetId = spreadsheetId
    this.credentials = credentials
    this.keyFile = keyFile
    this.transactionsTab = transactionsTab
    this.rulesTab = rulesTab
  }

  async listTransactions(): Promise<Transaction[]> {
    await this.ensureReady()
    const sheets = await this.getSheetsClient()
    const range = `${this.transactionsTab}!A2:L`

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    })

    const rows = response.data.values || []

    return rows
      .map((row: string[], index: number) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }: { row: string[] }) => row.some((cell) => String(cell || '').trim() !== ''))
      .map(({ row, rowNumber }: { row: string[]; rowNumber: number }) => mapTransactionRow(row, rowNumber))
  }

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    await this.ensureReady()
    const sheets = await this.getSheetsClient()
    const row = transactionToRow(transaction)

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.transactionsTab}!A:L`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    })

    return transaction
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    await this.ensureReady()
    const sheets = await this.getSheetsClient()
    const current = await this.findTransactionById(id)
    if (!current) return null

    const merged = {
      ...current,
      ...updates,
      id,
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.transactionsTab}!A${current._rowNumber}:L${current._rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [transactionToRow(merged as Transaction)] },
    })

    return { ...merged, _rowNumber: current._rowNumber } as Transaction
  }

  async deleteTransaction(id: string): Promise<boolean> {
    await this.ensureReady()
    const sheets = await this.getSheetsClient()
    const current = await this.findTransactionById(id)
    if (!current) return false

    await sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${this.transactionsTab}!A${current._rowNumber}:L${current._rowNumber}`,
    })

    return true
  }

  async listRules(): Promise<Rule[]> {
    await this.ensureReady()
    const sheets = await this.getSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.rulesTab}!A2:F`,
    })

    const rows = response.data.values || []
    return rows
      .map((row: string[], index: number) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }: { row: string[] }) => row.some((cell) => String(cell || '').trim() !== ''))
      .map(({ row, rowNumber }: { row: string[]; rowNumber: number }) => ({
        id: row[0] || uuidv4(),
        pattern: row[1] || '',
        category: row[2] || 'Miscellaneous',
        hits: Number.parseInt(row[3] || '0', 10) || 0,
        lastUsedAt: row[4] || '',
        createdAt: row[5] || '',
        _rowNumber: rowNumber,
      }))
  }

  async upsertRule({ pattern, category, createdAt, updatedAt }: { pattern: string; category: string; createdAt: string; updatedAt: string }): Promise<Rule | null> {
    await this.ensureReady()
    const sheets = await this.getSheetsClient()
    const normalizedPattern = String(pattern || '').trim().toLowerCase()
    if (!normalizedPattern) return null

    const rules = await this.listRules()
    const existing = rules.find(
      (rule) => String(rule.pattern || '').trim().toLowerCase() === normalizedPattern,
    )

    if (existing) {
      const updatedRule = {
        ...existing,
        category,
        hits: (existing.hits || 0) + 1,
        lastUsedAt: updatedAt,
      }
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.rulesTab}!A${existing._rowNumber}:F${existing._rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [ruleToRow(updatedRule)] },
      })
      return updatedRule
    }

    const newRule: Rule = {
      id: uuidv4(),
      pattern: normalizedPattern,
      category,
      hits: 1,
      lastUsedAt: updatedAt,
      createdAt,
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.rulesTab}!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [ruleToRow(newRule)],
      },
    })

    return newRule
  }

  private async findTransactionById(id: string): Promise<Transaction | null> {
    const transactions = await this.listTransactions()
    return transactions.find((tx) => tx.id === id) || null
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return

    const sheets = await this.getSheetsClient()
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      includeGridData: false,
    })

    const existingTitles = new Set(
      (meta.data.sheets || []).map((sheet: any) => sheet.properties.title),
    )
    const requests: any[] = []

    if (!existingTitles.has(this.transactionsTab)) {
      requests.push({
        addSheet: { properties: { title: this.transactionsTab } },
      })
    }

    if (!existingTitles.has(this.rulesTab)) {
      requests.push({
        addSheet: { properties: { title: this.rulesTab } },
      })
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests },
      })
    }

    await this.ensureHeaderRow(this.transactionsTab, TRANSACTIONS_HEADERS)
    await this.ensureHeaderRow(this.rulesTab, RULES_HEADERS)

    this.ready = true
  }

  private async ensureHeaderRow(tabName: string, headers: string[]): Promise<void> {
    const sheets = await this.getSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tabName}!1:1`,
    })

    const existing = response.data.values?.[0] || []
    const needsWrite = headers.some((header, index) => existing[index] !== header)

    if (!needsWrite) return

    const endColumn = numberToColumn(headers.length)
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${tabName}!A1:${endColumn}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    })
  }

  private async getSheetsClient() {
    if (this.sheets) return this.sheets

    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID (or GOOGLE_SHEETS_SPREADSHEET_ID) is required')
    }

    const authConfig: any = {
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }

    if (this.credentials) {
      authConfig.credentials = this.credentials
    } else if (this.keyFile) {
      authConfig.keyFile = this.keyFile
    } else {
      throw new Error(
        'Provide GOOGLE_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_SERVICE_ACCOUNT_JSON/GOOGLE_SERVICE_ACCOUNT_JSON_B64',
      )
    }

    const auth = new google.auth.GoogleAuth(authConfig)
    this.sheets = google.sheets({ version: 'v4', auth })
    return this.sheets
  }
}

function mapTransactionRow(row: string[], rowNumber: number): Transaction {
  return {
    id: row[0] || '',
    date: row[1] || '',
    amount: Number.parseFloat(row[2] || '0'),
    currency: row[3] || 'PHP',
    merchant: row[4] || '',
    category: row[5] || 'Miscellaneous',
    account: row[6] || 'General',
    note: row[7] || '',
    source: row[8] || 'manual',
    rawInput: row[9] || '',
    createdAt: row[10] || '',
    updatedAt: row[11] || '',
    _rowNumber: rowNumber,
  }
}

function transactionToRow(transaction: Transaction): string[] {
  return [
    transaction.id,
    transaction.date,
    String(transaction.amount),
    transaction.currency || 'PHP',
    transaction.merchant,
    transaction.category,
    transaction.account || 'General',
    transaction.note || '',
    transaction.source || 'manual',
    transaction.rawInput || '',
    transaction.createdAt,
    transaction.updatedAt,
  ]
}

function ruleToRow(rule: Rule): string[] {
  return [
    rule.id,
    String(rule.pattern || '').toLowerCase(),
    rule.category,
    String(rule.hits || 0),
    rule.lastUsedAt || '',
    rule.createdAt || '',
  ]
}

function numberToColumn(number: number): string {
  let n = number
  let output = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    output = String.fromCharCode(65 + rem) + output
    n = Math.floor((n - 1) / 26)
  }
  return output
}
