# Jot

Single-user budgeting web app built with **Nuxt 3** featuring:
- Manual transaction CRUD
- Natural-language quick add with LLM-powered parsing
- Google Sheets persistence (`Transactions` + `Rules` tabs)
- Dashboard (current month total + category breakdown + recent transactions)
- Rule learning when LLM category is overridden

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
npm install
npm run dev
```

Default URL: `http://localhost:3210`

For production build:
```bash
npm run build
npm run preview
```

---

## 4) Tailscale access

1. Run app on port `3210`
2. From another Tailnet device, open `http://<tailscale-hostname>:3210`

Detailed runbook: `DEPLOY_TAILSCALE.md`

---

## 5) API endpoints

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `POST /api/nl/parse` (alias: `/api/quick-add/parse`)
- `GET /api/summary?month=YYYY-MM` (alias: `/api/dashboard`)
- `GET /api/categories`
- `GET /api/health`
- `GET /api/sheet-url`

---

## 6) Tests

```bash
npm test
```

---

## 7) Tech stack

- **Framework**: Nuxt 3 (Vue 3 + Nitro server)
- **Language**: TypeScript
- **Styling**: Custom CSS (dark theme)
- **Data**: Google Sheets API via service account
- **NL parsing**: OpenAI-compatible API (gpt-4o-mini)
- **Testing**: Vitest
