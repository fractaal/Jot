const request = require('supertest');
const { createApp } = require('../src/app');
const { MemoryStore } = require('../src/services/memoryStore');

const categories = ['Food & Dining', 'Transportation', 'Groceries', 'Income', 'Miscellaneous'];

function makeApp(overrides = {}) {
  const store = overrides.store || new MemoryStore();
  const quickAddService =
    overrides.quickAddService ||
    ({
      parse: async (text) => ({
        transaction: {
          date: '2026-02-24',
          amount: 289,
          currency: 'PHP',
          account: 'E-wallet',
          category: 'Food & Dining',
          merchant: 'GrabFood',
          note: text,
        },
        meta: {
          source: 'llm',
          suggestedCategory: 'Food & Dining',
          confidence: 0.91,
          needsReview: false,
        },
      }),
    });

  const app = createApp({
    store,
    quickAddService,
    categories,
    timezone: 'Asia/Manila',
  });

  return { app, store };
}

describe('budgeting app smoke', () => {
  it('supports manual CRUD flow', async () => {
    const { app } = makeApp();

    const createRes = await request(app).post('/api/transactions').send({
      date: '2026-02-24',
      amount: 120,
      currency: 'PHP',
      category: 'Food & Dining',
      merchant: 'Jollibee',
      account: 'Cash',
      note: 'Lunch',
      source: 'manual',
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.transaction.id).toBeTruthy();

    const transactionId = createRes.body.transaction.id;

    const listRes = await request(app).get('/api/transactions');
    expect(listRes.status).toBe(200);
    expect(listRes.body.transactions).toHaveLength(1);

    const updateRes = await request(app).put(`/api/transactions/${transactionId}`).send({
      category: 'Transportation',
      merchant: 'Grab',
      amount: 160,
      account: 'E-wallet',
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.transaction.category).toBe('Transportation');
    expect(updateRes.body.transaction.merchant).toBe('Grab');

    const deleteRes = await request(app).delete(`/api/transactions/${transactionId}`);
    expect(deleteRes.status).toBe(200);

    const finalList = await request(app).get('/api/transactions');
    expect(finalList.body.transactions).toHaveLength(0);
  });

  it('returns dashboard/summary totals + category breakdown', async () => {
    const { app } = makeApp();

    await request(app).post('/api/transactions').send({
      date: '2026-02-01',
      amount: 200,
      currency: 'PHP',
      category: 'Food & Dining',
      merchant: 'Cafe',
      account: 'Card',
      note: '',
      source: 'manual',
    });

    await request(app).post('/api/transactions').send({
      date: '2026-02-03',
      amount: 300,
      currency: 'PHP',
      category: 'Transportation',
      merchant: 'Grab',
      account: 'E-wallet',
      note: '',
      source: 'manual',
    });

    await request(app).post('/api/transactions').send({
      date: '2026-02-04',
      amount: 500,
      currency: 'PHP',
      category: 'Income',
      merchant: 'Client',
      account: 'Bank',
      note: '',
      source: 'manual',
    });

    const res = await request(app).get('/api/summary?month=2026-02');
    expect(res.status).toBe(200);
    expect(res.body.currentMonthTotal).toBe(500);

    const breakdown = Object.fromEntries(res.body.categoryBreakdown.map((x) => [x.category, x.total]));
    expect(breakdown['Food & Dining']).toBe(200);
    expect(breakdown.Transportation).toBe(300);
    expect(breakdown.Income).toBeUndefined();
  });

  it('parses NL input and learns rule when category is overridden', async () => {
    const quickAddService = {
      parse: vi.fn(async () => ({
        transaction: {
          date: '2026-02-24',
          amount: 289,
          currency: 'PHP',
          account: 'E-wallet',
          category: 'Food & Dining',
          merchant: 'GrabFood',
          note: 'dinner',
        },
        meta: {
          source: 'llm',
          suggestedCategory: 'Food & Dining',
          confidence: 0.88,
          needsReview: false,
        },
      })),
    };

    const { app, store } = makeApp({ quickAddService });

    const parseRes = await request(app).post('/api/nl/parse').send({
      text: 'GrabFood 289 dinner yesterday',
    });

    expect(parseRes.status).toBe(200);
    expect(parseRes.body.transaction.category).toBe('Food & Dining');

    const saveRes = await request(app).post('/api/transactions').send({
      date: '2026-02-24',
      amount: 289,
      currency: 'PHP',
      category: 'Transportation',
      merchant: 'GrabFood',
      account: 'E-wallet',
      note: 'dinner',
      source: 'nl',
      rawInput: 'GrabFood 289 dinner yesterday',
      quickAddMeta: {
        source: 'llm',
        suggestedCategory: 'Food & Dining',
        originalText: 'GrabFood 289 dinner yesterday',
      },
    });

    expect(saveRes.status).toBe(201);

    const rules = await store.listRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].pattern).toBe('grabfood');
    expect(rules[0].category).toBe('Transportation');
    expect(rules[0].hits).toBe(1);
  });
});
