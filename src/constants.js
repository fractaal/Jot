const DEFAULT_CATEGORIES = [
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

const TRANSACTIONS_HEADERS = [
  'id',
  'date',
  'amount',
  'currency',
  'merchant',
  'category',
  'account',
  'note',
  'source',
  'raw_input',
  'created_at',
  'updated_at',
];

const RULES_HEADERS = [
  'id',
  'pattern',
  'category',
  'hits',
  'last_used_at',
  'created_at',
];

const SETTINGS_HEADERS = [
  'key',
  'value',
  'updated_at',
];

module.exports = {
  DEFAULT_CATEGORIES,
  TRANSACTIONS_HEADERS,
  RULES_HEADERS,
  SETTINGS_HEADERS,
};
