const { QuickAddService } = require('../src/services/quickAddService');
const { MemoryStore } = require('../src/services/memoryStore');

const categories = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Shopping',
  'Utilities',
  'Health',
  'Entertainment',
  'Education',
  'Travel',
  'Bills & Fees',
  'Personal Care',
  'Transfer',
  'Income',
  'Miscellaneous',
];

const sampleInputs = [
  'GrabFood 289 dinner last night',
  'Spent 430 at Uniqlo for socks yesterday',
  'Angkas 95 to BGC this morning',
  'SM Supermarket 1245 groceries today',
  'Paid Meralco 3870 electric bill today',
  'Netflix 549 subscription Feb 20',
  'Shell 2100 gas full tank Monday',
  'Lazada 999 phone case and cable today',
  'Movie tickets 760 for two at SM Cinema last Sunday',
  'Manila Water 620 bill 02/18',
];

describe('NL parser smoke cases', () => {
  it('handles at least 10 representative NL phrases', async () => {
    const service = new QuickAddService({
      store: new MemoryStore(),
      categories,
      timezone: 'Asia/Manila',
      llmParser: async () => {
        throw new Error('LLM disabled in test');
      },
    });

    for (const text of sampleInputs) {
      const result = await service.parse(text);
      expect(result.transaction.amount).toBeGreaterThan(0);
      expect(result.transaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(categories).toContain(result.transaction.category);
      expect(result.transaction.currency).toBe('PHP');
    }
  });
});
