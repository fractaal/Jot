const path = require('path');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { normalizeTransactionInput, sortTransactionsNewestFirst } = require('./lib/transactions');
const { nowInTimezone } = require('./lib/time');

const NON_EXPENSE_CATEGORIES = new Set(['income', 'transfer']);

function createApp({ store, quickAddService, categories, timezone = 'Asia/Manila', spreadsheetId = null }) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timezone });
  });

  app.get('/api/categories', (_req, res) => {
    res.json({ categories });
  });

  app.get('/api/sheet-url', (_req, res) => {
    if (!spreadsheetId) {
      return res.json({ url: null });
    }
    return res.json({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` });
  });

  app.get('/api/transactions', async (req, res, next) => {
    try {
      const month = String(req.query.month || '').trim();
      const category = String(req.query.category || '').trim();
      const q = String(req.query.q || '').trim().toLowerCase();

      let transactions = await store.listTransactions();

      if (month) {
        transactions = transactions.filter((tx) => String(tx.date || '').startsWith(month));
      }

      if (category) {
        transactions = transactions.filter((tx) => tx.category === category);
      }

      if (q) {
        transactions = transactions.filter((tx) => {
          const haystack = `${tx.merchant} ${tx.note} ${tx.category} ${tx.rawInput}`.toLowerCase();
          return haystack.includes(q);
        });
      }

      res.json({
        transactions: sortTransactionsNewestFirst(transactions).map(stripInternalFields),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/transactions', async (req, res, next) => {
    try {
      const { value, errors } = normalizeTransactionInput(req.body, { timezone, categories });
      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      const nowIso = nowInTimezone(timezone).toISOString();
      const transaction = {
        id: uuidv4(),
        ...value,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await store.createTransaction(transaction);

      await maybeLearnRule({
        store,
        body: req.body,
        transaction,
        nowIso,
      });

      return res.status(201).json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/transactions/:id', async (req, res, next) => {
    try {
      const id = req.params.id;
      const existing = (await store.listTransactions()).find((tx) => tx.id === id);
      if (!existing) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const mergedPayload = {
        ...existing,
        ...req.body,
      };

      const { value, errors } = normalizeTransactionInput(mergedPayload, { timezone, categories });
      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      const updated = await store.updateTransaction(id, {
        ...value,
        updatedAt: nowInTimezone(timezone).toISOString(),
      });

      return res.json({ transaction: stripInternalFields(updated) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/transactions/:id', async (req, res, next) => {
    try {
      const ok = await store.deleteTransaction(req.params.id);
      if (!ok) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  const parseQuickAddHandler = async (req, res, next) => {
    try {
      const text = String(req.body?.text || '').trim();
      if (!text) {
        return res.status(400).json({ error: 'text is required' });
      }

      const result = await quickAddService.parse(text);
      return res.json({
        ...result,
        text,
      });
    } catch (error) {
      next(error);
    }
  };

  app.post('/api/nl/parse', parseQuickAddHandler);
  app.post('/api/quick-add/parse', parseQuickAddHandler);

  const summaryHandler = async (req, res, next) => {
    try {
      const month = String(req.query.month || '').trim() || nowInTimezone(timezone).format('YYYY-MM');
      const transactions = await store.listTransactions();
      const monthTransactions = transactions.filter((tx) => String(tx.date || '').startsWith(month));

      const currentMonthExpenses = monthTransactions.filter(
        (tx) => !NON_EXPENSE_CATEGORIES.has(String(tx.category || '').toLowerCase()),
      );
      const currentMonthTotal = sumAmounts(currentMonthExpenses);

      const categoryBreakdown = Object.entries(
        currentMonthExpenses.reduce((acc, tx) => {
          const key = tx.category || 'Miscellaneous';
          const value = Number(tx.amount) || 0;
          acc[key] = (acc[key] || 0) + value;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .map(([category, total]) => ({ category, total }));

      const recentTransactions = sortTransactionsNewestFirst(transactions)
        .slice(0, 10)
        .map(stripInternalFields);

      return res.json({
        month,
        currentMonthTotal,
        categoryBreakdown,
        recentTransactions,
      });
    } catch (error) {
      next(error);
    }
  };

  app.get('/api/dashboard', summaryHandler);
  app.get('/api/summary', summaryHandler);

  app.use((error, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  });

  return app;
}

function stripInternalFields(transaction) {
  if (!transaction) return transaction;
  const { _rowNumber, ...rest } = transaction;
  return rest;
}

function sumAmounts(transactions) {
  return transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
}

async function maybeLearnRule({ store, body, transaction, nowIso }) {
  const quickAddMeta = body.quickAddMeta || body.quick_add_meta;
  if (!quickAddMeta || !['nl', 'quick-add'].includes(transaction.source)) return;

  const source = String(quickAddMeta.source || '').toLowerCase();
  const suggestedCategory = String(quickAddMeta.suggestedCategory || '').trim();
  if (source !== 'llm' || !suggestedCategory) return;

  if (suggestedCategory === transaction.category) return;

  const pattern = buildPattern({
    merchant: quickAddMeta.merchant || transaction.merchant,
    rawInput: quickAddMeta.originalText || quickAddMeta.rawInput || transaction.rawInput,
  });

  if (!pattern) return;

  await store.upsertRule({
    pattern,
    category: transaction.category,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}

function buildPattern({ merchant, rawInput }) {
  const normalizedMerchant = String(merchant || '').trim().toLowerCase();
  if (normalizedMerchant && normalizedMerchant !== 'unknown') return normalizedMerchant;

  const firstToken = String(rawInput || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => value.toLowerCase())
    .find((value) => /[a-z]/i.test(value));

  return firstToken || null;
}

module.exports = {
  createApp,
  maybeLearnRule,
  buildPattern,
};
