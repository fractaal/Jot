const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { TRANSACTIONS_HEADERS, RULES_HEADERS, SETTINGS_HEADERS } = require('../constants');

class GoogleSheetsStore {
  constructor({
    spreadsheetId,
    credentials,
    keyFile,
    transactionsTab = 'Transactions',
    rulesTab = 'Rules',
    settingsTab = 'Settings',
  }) {
    this.spreadsheetId = spreadsheetId;
    this.credentials = credentials;
    this.keyFile = keyFile;
    this.transactionsTab = transactionsTab;
    this.rulesTab = rulesTab;
    this.settingsTab = settingsTab;
    this.ready = false;
    this.sheets = null;
  }

  async listTransactions() {
    await this.ensureReady();
    const sheets = await this.getSheetsClient();
    const range = `${this.transactionsTab}!A2:L`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    return rows
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }) => row.some((cell) => String(cell || '').trim() !== ''))
      .map(({ row, rowNumber }) => mapTransactionRow(row, rowNumber));
  }

  async createTransaction(transaction) {
    await this.ensureReady();
    const sheets = await this.getSheetsClient();
    const row = transactionToRow(transaction);

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.transactionsTab}!A:L`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    return transaction;
  }

  async updateTransaction(id, updates) {
    await this.ensureReady();
    const sheets = await this.getSheetsClient();
    const current = await this.findTransactionById(id);
    if (!current) return null;

    const merged = {
      ...current,
      ...updates,
      id,
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.transactionsTab}!A${current._rowNumber}:L${current._rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [transactionToRow(merged)] },
    });

    return { ...merged, _rowNumber: current._rowNumber };
  }

  async deleteTransaction(id) {
    await this.ensureReady();
    const sheets = await this.getSheetsClient();
    const current = await this.findTransactionById(id);
    if (!current) return false;

    await sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${this.transactionsTab}!A${current._rowNumber}:L${current._rowNumber}`,
    });

    return true;
  }

  async listRules() {
    await this.ensureReady();
    const sheets = await this.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.rulesTab}!A2:F`,
    });

    const rows = response.data.values || [];
    return rows
      .map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(({ row }) => row.some((cell) => String(cell || '').trim() !== ''))
      .map(({ row, rowNumber }) => ({
        id: row[0] || uuidv4(),
        pattern: row[1] || '',
        category: row[2] || 'Miscellaneous',
        hits: Number.parseInt(row[3] || '0', 10) || 0,
        lastUsedAt: row[4] || '',
        createdAt: row[5] || '',
        _rowNumber: rowNumber,
      }));
  }

  async upsertRule({ pattern, category, createdAt, updatedAt }) {
    await this.ensureReady();
    const sheets = await this.getSheetsClient();
    const normalizedPattern = String(pattern || '').trim().toLowerCase();
    if (!normalizedPattern) return null;

    const rules = await this.listRules();
    const existing = rules.find((rule) => String(rule.pattern || '').trim().toLowerCase() === normalizedPattern);

    if (existing) {
      const updatedRule = {
        ...existing,
        category,
        hits: (existing.hits || 0) + 1,
        lastUsedAt: updatedAt,
      };
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.rulesTab}!A${existing._rowNumber}:F${existing._rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [ruleToRow(updatedRule)] },
      });
      return updatedRule;
    }

    const newRule = {
      id: uuidv4(),
      pattern: normalizedPattern,
      category,
      hits: 1,
      lastUsedAt: updatedAt,
      createdAt,
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.rulesTab}!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [ruleToRow(newRule)],
      },
    });

    return newRule;
  }

  async getSetting(key) {
    await this.ensureReady();
    const sheets = await this.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.settingsTab}!A2:C`,
    });

    const rows = response.data.values || [];
    const row = rows.find((r) => r[0] === key);
    return row ? row[1] : null;
  }

  async setSetting(key, value) {
    await this.ensureReady();
    const sheets = await this.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.settingsTab}!A2:C`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === key);
    const now = new Date().toISOString();

    if (rowIndex >= 0) {
      const sheetRow = rowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.settingsTab}!A${sheetRow}:C${sheetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[key, String(value), now]] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.settingsTab}!A:C`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [[key, String(value), now]] },
      });
    }
  }

  async findTransactionById(id) {
    const transactions = await this.listTransactions();
    return transactions.find((tx) => tx.id === id) || null;
  }

  async ensureReady() {
    if (this.ready) return;

    const sheets = await this.getSheetsClient();
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      includeGridData: false,
    });

    const existingTitles = new Set((meta.data.sheets || []).map((sheet) => sheet.properties.title));
    const requests = [];

    if (!existingTitles.has(this.transactionsTab)) {
      requests.push({
        addSheet: { properties: { title: this.transactionsTab } },
      });
    }

    if (!existingTitles.has(this.rulesTab)) {
      requests.push({
        addSheet: { properties: { title: this.rulesTab } },
      });
    }

    if (!existingTitles.has(this.settingsTab)) {
      requests.push({
        addSheet: { properties: { title: this.settingsTab } },
      });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests },
      });
    }

    await this.ensureHeaderRow(this.transactionsTab, TRANSACTIONS_HEADERS);
    await this.ensureHeaderRow(this.rulesTab, RULES_HEADERS);
    await this.ensureHeaderRow(this.settingsTab, SETTINGS_HEADERS);

    this.ready = true;
  }

  async ensureHeaderRow(tabName, headers) {
    const sheets = await this.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tabName}!1:1`,
    });

    const existing = response.data.values?.[0] || [];
    const needsWrite = headers.some((header, index) => existing[index] !== header);

    if (!needsWrite) return;

    const endColumn = numberToColumn(headers.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${tabName}!A1:${endColumn}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });
  }

  async getSheetsClient() {
    if (this.sheets) return this.sheets;

    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID (or GOOGLE_SHEETS_SPREADSHEET_ID) is required');
    }

    const authConfig = {
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    };

    if (this.credentials) {
      authConfig.credentials = this.credentials;
    } else if (this.keyFile) {
      authConfig.keyFile = this.keyFile;
    } else {
      throw new Error('Provide GOOGLE_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_SERVICE_ACCOUNT_JSON/GOOGLE_SERVICE_ACCOUNT_JSON_B64');
    }

    const auth = new google.auth.GoogleAuth(authConfig);
    this.sheets = google.sheets({ version: 'v4', auth });
    return this.sheets;
  }
}

function mapTransactionRow(row, rowNumber) {
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
  };
}

function transactionToRow(transaction) {
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
  ];
}

function ruleToRow(rule) {
  return [
    rule.id,
    String(rule.pattern || '').toLowerCase(),
    rule.category,
    String(rule.hits || 0),
    rule.lastUsedAt || '',
    rule.createdAt || '',
  ];
}

function numberToColumn(number) {
  let n = number;
  let output = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    output = String.fromCharCode(65 + rem) + output;
    n = Math.floor((n - 1) / 26);
  }
  return output;
}

module.exports = {
  GoogleSheetsStore,
};
