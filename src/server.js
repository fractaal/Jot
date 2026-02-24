const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createApp } = require('./app');
const { DEFAULT_CATEGORIES } = require('./constants');
const { GoogleSheetsStore } = require('./services/googleSheetsStore');
const { QuickAddService } = require('./services/quickAddService');
const { createOpenAiParser } = require('./services/openAiParser');

dotenv.config({ override: true });

const timezone = process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Manila';
const port = Number.parseInt(process.env.PORT || '3210', 10);
const spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

const categories = parseCategories(process.env.CATEGORIES);
const credentials = resolveServiceAccountCredentials();
const keyFile = resolveKeyFile();

validateRequiredConfig({
  spreadsheetId,
  credentials,
  keyFile,
});

const store = new GoogleSheetsStore({
  spreadsheetId,
  credentials,
  keyFile,
});

const llmParser = process.env.OPENAI_API_KEY
  ? createOpenAiParser({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })
  : null;

const quickAddService = new QuickAddService({
  store,
  categories,
  timezone,
  llmParser,
});

const app = createApp({
  store,
  quickAddService,
  categories,
  timezone,
});

app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Budgeting app running at http://0.0.0.0:${port}`);
  if (!process.env.OPENAI_API_KEY) {
    // eslint-disable-next-line no-console
    console.log('OPENAI_API_KEY is not set. Quick Add will use rule/heuristic fallback only.');
  }
});

function parseCategories(raw) {
  if (!raw) return DEFAULT_CATEGORIES;
  const list = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (list.length === 0) return DEFAULT_CATEGORIES;
  if (!list.includes('Miscellaneous')) list.push('Miscellaneous');
  return list;
}

function resolveServiceAccountCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) {
    const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      type: 'service_account',
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

function resolveKeyFile() {
  const configured = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (!configured) return null;

  const resolved = path.resolve(configured);
  if (!fs.existsSync(resolved)) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY_FILE does not exist: ${resolved}`);
  }
  return resolved;
}

function validateRequiredConfig({ spreadsheetId, credentials, keyFile }) {
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID (or GOOGLE_SHEETS_SPREADSHEET_ID) is required');
  }

  if (!credentials && !keyFile) {
    throw new Error('Provide GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON_B64, or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY');
  }
}
