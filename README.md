# Budgeting App MVP

Single-user budgeting web app with:
- Manual transaction CRUD
- Natural-language quick add with editable preview (never auto-saves)
- Google Sheets persistence (`Transactions` + `Rules` tabs)
- Dashboard (current month total + category breakdown + recent transactions)
- Rule learning when LLM category is overridden

Project root: `/root/.openclaw/workspace/budgeting-app`

---

## 1) Prerequisites
- Node.js 20+ (tested on Node 22)
- npm
- Google Sheet + service account credentials
- (Optional) OpenAI API key for LLM parsing

---

## 2) Environment setup

1. Copy template:
```bash
cd /root/.openclaw/workspace/budgeting-app
cp .env.example .env
```

2. Fill required values in `.env`:
- `GOOGLE_SHEET_ID` (or `GOOGLE_SHEETS_SPREADSHEET_ID`)
- one service-account auth method:
  - `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`, or
  - `GOOGLE_SERVICE_ACCOUNT_JSON`, or
  - `GOOGLE_SERVICE_ACCOUNT_JSON_B64`, or
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`
- `OPENAI_API_KEY` (recommended for best NL parse quality)
- `APP_TIMEZONE=Asia/Manila`

See also:
- `GOOGLE_SHEETS_SETUP.md`
- `DEPLOY_TAILSCALE.md`

---

## 3) Install and run

```bash
cd /root/.openclaw/workspace/budgeting-app
npm install
npm run start
```

Default URL:
- `http://127.0.0.1:3210`

If you want dev watch mode:
```bash
npm run dev
```

---

## 4) Tailscale access

Quick path:
1. Run app on port `3210`
2. From another Tailnet device, open:
   - `http://<tailscale-hostname>:3210`

Detailed runbook:
- `DEPLOY_TAILSCALE.md`

---

## 5) API endpoints (MVP)

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `POST /api/nl/parse` (alias: `/api/quick-add/parse`)
- `GET /api/summary?month=YYYY-MM` (alias: `/api/dashboard`)
- `GET /api/categories`
- `GET /api/health`

---

## 6) Tests

Run smoke tests:
```bash
cd /root/.openclaw/workspace/budgeting-app
npm test
```

Test coverage includes:
- Manual CRUD
- Summary totals/category breakdown
- NL parse endpoint
- Rule-learning behavior
- 10 representative NL phrases (smoke)

NL sample references:
- `NL_TEST_CASES.md`
- `scripts/sample-transactions.csv`
