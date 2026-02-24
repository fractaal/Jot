const { v4: uuidv4 } = require('uuid');

class MemoryStore {
  constructor({ seedTransactions = [], seedRules = [] } = {}) {
    this.transactions = [...seedTransactions];
    this.rules = [...seedRules];
  }

  async listTransactions() {
    return [...this.transactions].map((tx, idx) => ({ ...tx, _rowNumber: idx + 2 }));
  }

  async createTransaction(transaction) {
    this.transactions.push({ ...transaction });
    return transaction;
  }

  async updateTransaction(id, updates) {
    const index = this.transactions.findIndex((tx) => tx.id === id);
    if (index < 0) return null;
    this.transactions[index] = { ...this.transactions[index], ...updates, id };
    return { ...this.transactions[index], _rowNumber: index + 2 };
  }

  async deleteTransaction(id) {
    const index = this.transactions.findIndex((tx) => tx.id === id);
    if (index < 0) return false;
    this.transactions.splice(index, 1);
    return true;
  }

  async listRules() {
    return [...this.rules].map((rule, idx) => ({ ...rule, _rowNumber: idx + 2 }));
  }

  async upsertRule({ pattern, category, createdAt, updatedAt }) {
    const normalizedPattern = String(pattern || '').trim().toLowerCase();
    if (!normalizedPattern) return null;

    const existingIndex = this.rules.findIndex((rule) => String(rule.pattern || '').toLowerCase() === normalizedPattern);

    if (existingIndex >= 0) {
      this.rules[existingIndex] = {
        ...this.rules[existingIndex],
        category,
        hits: (this.rules[existingIndex].hits || 0) + 1,
        lastUsedAt: updatedAt,
      };
      return { ...this.rules[existingIndex], _rowNumber: existingIndex + 2 };
    }

    const rule = {
      id: uuidv4(),
      pattern: normalizedPattern,
      category,
      hits: 1,
      lastUsedAt: updatedAt,
      createdAt,
    };

    this.rules.push(rule);
    return { ...rule, _rowNumber: this.rules.length + 1 };
  }
}

module.exports = {
  MemoryStore,
};
