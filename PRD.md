# Budgeting App PRD (MVP in 1 day)

## 1) Product intent
Build a lightweight web budgeting app that feels fast and low-friction for daily expense capture.

Primary magic: **natural-language expense capture** ("GrabFood 289 dinner last night") that auto-fills amount/date/merchant/category/notes and saves to Google Sheets.

## 2) User + jobs to be done
Single primary user: Ben.

Core jobs:
1. Log expenses in <10 seconds from desktop/mobile browser.
2. See monthly spend + where money is going.
3. Fix wrong categorization quickly.
4. Keep data in Google Sheets for portability.

## 3) Success criteria (ship gate)
1. App runs locally and is reachable via Tailscale.
2. Google Sheets connection works (read/write transactions).
3. Manual transaction CRUD works.
4. NL entry works with LLM auto-categorization.
5. Dashboard shows current month totals + category breakdown + recent transactions.
6. Docs include setup/env, Google service account steps, and Tailscale exposure.

## 4) Scope
### In scope (MVP)
- Authentication: optional simple passphrase gate (single-user)
- Transactions list + filters (month/category/text)
- Add/Edit/Delete transaction (form)
- NL Quick Add composer
- LLM parser + category suggestion + confidence
- Correction flow: user can override category before save
- Google Sheets as source of truth
- Monthly summary cards + category chart/table

### Out of scope (v2+)
- Multi-user auth
- Bank sync (Plaid etc.)
- Recurring bill detection
- Receipt OCR
- Push notifications
- Native mobile app

## 5) UX flow
### A) Manual flow (typical)
1. Open app
2. Click "Add transaction"
3. Enter date, amount, merchant, category, account, notes
4. Save
5. Row is written to Google Sheet and appears in list/dashboard

### B) NL flow (magic)
1. User types free text in Quick Add:
   - Example: "Spent 430 at Uniqlo for socks yesterday"
2. App sends text + category taxonomy to server endpoint
3. LLM returns structured parse:
   - amount=430
   - currency=PHP
   - merchant=Uniqlo
   - date=<yesterday>
   - category=Shopping
   - note="socks"
   - confidence=0.86
4. UI shows parsed preview chips with editable fields
5. User confirms or edits then saves
6. Save writes row and optionally records correction rule

### C) Nifty feature (MVP-safe)
**Auto-learning category hints from user corrections**
- If LLM suggests category X but user changes to Y, app stores `(merchant/text pattern -> Y)` in a `Rules` tab in the same sheet.
- Future entries check rules first, then LLM fallback.
- Gives immediate “it learns me” feeling without heavy infrastructure.

## 6) Data model
Google Sheet workbook name: configurable (e.g., `BudgetingApp`).

### Sheet: `Transactions`
Columns (header row):
- `id` (uuid)
- `date` (YYYY-MM-DD)
- `amount` (number; positive expense)
- `currency` (default PHP)
- `merchant` (string)
- `category` (string)
- `account` (Cash/Card/E-wallet/etc)
- `note` (string)
- `source` (`manual|nl`)
- `raw_input` (original NL text, optional)
- `created_at` (ISO timestamp)
- `updated_at` (ISO timestamp)

### Sheet: `Rules`
- `id`
- `pattern` (merchant/text fragment)
- `category`
- `hits`
- `last_used_at`
- `created_at`

### Sheet: `Categories`
- Optional custom categories list; fallback to defaults in code.

## 7) APIs (app-internal)
- `POST /api/transactions` create
- `GET /api/transactions?month=YYYY-MM` list/filter
- `PUT /api/transactions/:id` update
- `DELETE /api/transactions/:id` delete
- `POST /api/nl/parse` parse text -> structured suggestion
- `GET /api/summary?month=YYYY-MM` totals by category + month total

## 8) LLM parsing contract
Input:
- raw text
- timezone (Asia/Manila)
- category list
- examples

Output JSON schema:
- `amount: number`
- `currency: string`
- `merchant: string`
- `date: string (YYYY-MM-DD)`
- `category: string`
- `note: string`
- `confidence: number (0-1)`
- `needs_review: boolean`

Guardrails:
- If amount missing/ambiguous, set `needs_review=true` and confidence low.
- Never auto-save without showing preview confirmation.

## 9) Tech decisions (implementation-owned)
- Framework: Next.js (App Router) + TypeScript
- UI: Tailwind + simple component primitives
- Data access: Google Sheets API via service account
- LLM: OpenAI-compatible API call with strict JSON response
- Charts: lightweight library or table fallback

## 10) Environment/config
Required env vars:
- `OPENAI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`
- `APP_PASSPHRASE` (optional)
- `TZ=Asia/Manila`

## 11) Deployment + access
MVP deployment target: run on Ben’s host and expose over Tailscale.

- Start app on fixed port (e.g., 3210)
- Access via `http://<tailscale-hostname>:3210`
- Optional: reverse-proxy with Caddy/Nginx later

## 12) Testing + validation
Minimum checks:
1. Create, edit, delete transaction updates sheet correctly.
2. NL parse handles at least 10 sample phrases.
3. Summary totals match sheet data for a month.
4. Rules learning works for corrected category on repeat merchant.

## 13) Delivery artifacts
- `/budgeting-app` codebase
- `/budgeting-app/README.md` with setup + run + deploy instructions
- `/budgeting-app/PRD.md` (this file)
- Optional `.env.example`

## 14) Build plan (today)
1. Scaffold app + Google Sheets client
2. Implement transactions CRUD
3. Implement NL parse endpoint + preview UI
4. Implement dashboard summary
5. Add rules learning
6. Smoke test + docs + handoff
