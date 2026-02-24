# Google Sheets Setup (MVP)

This guide sets up Google Sheets as the source of truth for the budgeting app.

## 0) What you will finish with
- 1 Google Cloud project with Sheets API enabled
- 1 service account key (JSON)
- 1 spreadsheet with tabs:
  - `Transactions`
  - `Rules`
  - `Categories` (optional but recommended)
- Correct headers on row 1
- Sheet shared to service account as **Editor**

---

## 1) Create/prepare Google Cloud project
1. Open Google Cloud Console: `https://console.cloud.google.com/`
2. Create/select project (example name: `budgeting-app-mvp`).
3. Enable APIs:
   - **Google Sheets API**
   - **Google Drive API**

---

## 2) Create service account and JSON key
1. Go to **IAM & Admin → Service Accounts**.
2. Create service account (example: `budgeting-app-sa`).
3. Grant basic role (Editor is enough for MVP).
4. Open service account → **Keys** → **Add Key → Create new key → JSON**.
5. Save JSON securely (do not commit to git).

From the JSON file, keep these values:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

---

## 3) Create spreadsheet and tabs
1. Create new Google Sheet (example name: `BudgetingApp`).
2. Copy sheet ID from URL:
   - URL format: `https://docs.google.com/spreadsheets/d/<GOOGLE_SHEET_ID>/edit#gid=0`
3. Create/rename tabs exactly:
   - `Transactions`
   - `Rules`
   - `Categories`

---

## 4) Required headers (row 1)

### 4.1 `Transactions` tab (required)
Set **exact headers** in row 1:

```text
id,date,amount,currency,merchant,category,account,note,source,raw_input,created_at,updated_at
```

### 4.2 `Rules` tab (required)
Set headers in row 1:

```text
id,pattern,category,hits,last_used_at,created_at
```

### 4.3 `Categories` tab (optional)
Recommended header:

```text
category
```

Recommended starter rows (one per line):
- Food & Dining
- Groceries
- Transportation
- Shopping
- Utilities
- Health
- Entertainment
- Education
- Travel
- Bills & Fees
- Personal Care
- Miscellaneous

---

## 5) Share spreadsheet with service account
1. In Google Sheet, click **Share**.
2. Add `GOOGLE_SERVICE_ACCOUNT_EMAIL` (the service-account email).
3. Permission: **Editor**.
4. Remove public link sharing (keep private).

If not shared, API calls will fail with 403/404 style permission errors.

---

## 6) Configure app environment
In your app env file (`.env` / `.env.local`), set:

```bash
OPENAI_API_KEY=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@...gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=<sheet-id>
TZ=Asia/Manila
```

Notes:
- Keep literal `\n` in `.env` value (the app should convert to real newlines at runtime).
- Never commit `.env` or JSON key files.

---

## 7) Validation steps

### 7.1 Header + sharing validation
- Confirm tab names exactly match `Transactions`, `Rules`, `Categories`
- Confirm row 1 headers are exact and ordered as above
- Confirm service-account email has Editor access

### 7.2 App-level write/read validation
1. Start app locally.
2. Add one manual transaction from UI.
3. Confirm one new row appears in `Transactions`.
4. Use NL Quick Add once and confirm:
   - `source=nl`
   - `raw_input` is populated
5. Edit the saved row and confirm `updated_at` changes.

Optional API probe with PHP (if endpoint is available):

```bash
php -r '
$payload = [
  "date" => "2026-02-24",
  "amount" => 123,
  "currency" => "PHP",
  "merchant" => "Setup Check",
  "category" => "Miscellaneous",
  "account" => "Cash",
  "note" => "Google Sheets setup validation",
  "source" => "manual"
];
$ch = curl_init("http://127.0.0.1:3210/api/transactions");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
  CURLOPT_POSTFIELDS => json_encode($payload),
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP $code\n$res\n";
'
```

---

## 8) Troubleshooting

### A) `The caller does not have permission` / 403
- Sheet not shared to service-account email
- Wrong Google account/project in use

### B) `invalid_grant` or auth failures
- `GOOGLE_PRIVATE_KEY` malformed (newline escaping issue)
- Key revoked/rotated

### C) Data writes but columns shifted
- Header order mismatch in `Transactions`
- Extra hidden columns in row 1

### D) Rules are not applied
- `Rules` tab name misspelled
- Missing required `Rules` headers

### E) `Sheet not found`
- Wrong `GOOGLE_SHEET_ID`
- Service account has no access to that sheet

---

## 9) Security notes
- Store key JSON in a secure path with strict permissions (`chmod 600`)
- Never paste private key into chat/screenshots
- Rotate service-account key after any accidental exposure
- Keep spreadsheet private (no "Anyone with link")
- Use least privilege and a dedicated service account for this app
