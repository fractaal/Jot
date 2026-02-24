import { v4 as uuidv4 } from 'uuid'

export interface Transaction {
  id: string
  date: string
  amount: number
  currency: string
  merchant: string
  category: string
  account: string
  note: string
  source: string
  rawInput: string
  createdAt: string
  updatedAt: string
  _rowNumber?: number
}

export interface Rule {
  id: string
  pattern: string
  category: string
  hits: number
  lastUsedAt: string
  createdAt: string
  _rowNumber?: number
}

export interface Store {
  listTransactions(): Promise<Transaction[]>
  createTransaction(transaction: Transaction): Promise<Transaction>
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null>
  deleteTransaction(id: string): Promise<boolean>
  listRules(): Promise<Rule[]>
  upsertRule(rule: { pattern: string; category: string; createdAt: string; updatedAt: string }): Promise<Rule | null>
}

export class MemoryStore implements Store {
  transactions: Transaction[]
  rules: Rule[]

  constructor({ seedTransactions = [], seedRules = [] }: { seedTransactions?: Transaction[]; seedRules?: Rule[] } = {}) {
    this.transactions = [...seedTransactions]
    this.rules = [...seedRules]
  }

  async listTransactions(): Promise<Transaction[]> {
    return [...this.transactions].map((tx, idx) => ({ ...tx, _rowNumber: idx + 2 }))
  }

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    this.transactions.push({ ...transaction })
    return transaction
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const index = this.transactions.findIndex((tx) => tx.id === id)
    if (index < 0) return null
    this.transactions[index] = { ...this.transactions[index], ...updates, id }
    return { ...this.transactions[index], _rowNumber: index + 2 }
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const index = this.transactions.findIndex((tx) => tx.id === id)
    if (index < 0) return false
    this.transactions.splice(index, 1)
    return true
  }

  async listRules(): Promise<Rule[]> {
    return [...this.rules].map((rule, idx) => ({ ...rule, _rowNumber: idx + 2 }))
  }

  async upsertRule({ pattern, category, createdAt, updatedAt }: { pattern: string; category: string; createdAt: string; updatedAt: string }): Promise<Rule | null> {
    const normalizedPattern = String(pattern || '').trim().toLowerCase()
    if (!normalizedPattern) return null

    const existingIndex = this.rules.findIndex(
      (rule) => String(rule.pattern || '').toLowerCase() === normalizedPattern,
    )

    if (existingIndex >= 0) {
      this.rules[existingIndex] = {
        ...this.rules[existingIndex],
        category,
        hits: (this.rules[existingIndex].hits || 0) + 1,
        lastUsedAt: updatedAt,
      }
      return { ...this.rules[existingIndex], _rowNumber: existingIndex + 2 }
    }

    const rule: Rule = {
      id: uuidv4(),
      pattern: normalizedPattern,
      category,
      hits: 1,
      lastUsedAt: updatedAt,
      createdAt,
    }

    this.rules.push(rule)
    return { ...rule, _rowNumber: this.rules.length + 1 }
  }
}
