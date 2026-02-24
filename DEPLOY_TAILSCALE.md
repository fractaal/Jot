# Deploy Budgeting App on Tailscale (Single-User Runbook)

This runbook exposes the local MVP app over your Tailnet only (not public internet).

## 0) Target outcome
- App runs on host at port `3210`
- Reachable from your own Tailscale devices via:
  - `http://<tailscale-hostname>:3210` (direct)
  - or `https://<tailscale-hostname>.<tailnet>.ts.net` (if using `tailscale serve`)

## 1) Assumptions
- Host OS: Linux
- App directory: project root
- Time zone should be `Asia/Manila`
- You already have a Tailscale account and at least one client device logged into the same Tailnet

---

## 2) Preflight checks

### 2.1 Verify Tailscale installed
```bash
tailscale version
```
If missing:
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

### 2.2 Bring host online in Tailnet
```bash
sudo tailscale up --ssh --hostname budgeting-app-mvp
```
Then verify:
```bash
tailscale status
tailscale ip -4
```

### 2.3 Verify app env basics
Ensure these exist in app env:
- `GOOGLE_SHEET_ID` (or `GOOGLE_SHEETS_SPREADSHEET_ID`)
- service-account auth via one of:
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`, or
  - `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`, or
  - `GOOGLE_SERVICE_ACCOUNT_JSON`, or
  - `GOOGLE_SERVICE_ACCOUNT_JSON_B64`
- `OPENAI_API_KEY` (recommended)
- `APP_TIMEZONE=Asia/Manila`

Quick PHP preflight:
```bash
php -r 'date_default_timezone_set("Asia/Manila"); echo "Now: ".date("c").PHP_EOL;'
```

---

## 3) Start the app on fixed port

From project root:
```bash
cd /path/to/jot
```

Recommended start:
```bash
export APP_TIMEZONE=Asia/Manila
export PORT=3210
npm run build
npm run start
```

This app binds to `0.0.0.0` automatically in `src/server.js`.

Confirm listening:
```bash
ss -ltnp | grep 3210
```
Expected: process bound on `0.0.0.0:3210` or `[::]:3210`.

---

## 4) Local and Tailnet reachability checks

### 4.1 Local host check
```bash
curl -i http://127.0.0.1:3210/
```

Optional API probe using PHP:
```bash
php -r '$u="http://127.0.0.1:3210/api/summary?month=2026-02"; $r=@file_get_contents($u); echo $r===false?"FAILED\n":$r.PHP_EOL;'
```

### 4.2 Tailnet check (from another Tailscale device)
1. Resolve host:
   ```bash
   tailscale ping budgeting-app-mvp
   ```
2. Open app:
   - `http://budgeting-app-mvp:3210`
   - or `http://<tailscale-ip>:3210`

---

## 5) Optional: safer HTTPS endpoint with `tailscale serve`

If you prefer HTTPS + MagicDNS endpoint instead of raw `:3210`:

```bash
sudo tailscale serve --bg --https=443 http://127.0.0.1:3210
sudo tailscale serve status
```

Then use the provided `https://<machine>.<tailnet>.ts.net` URL.

> For single-user MVP, this is usually cleaner than exposing a raw app port.

---

## 6) Troubleshooting

### A) App works locally but not over Tailscale
- Check host is online: `tailscale status`
- Check app bind address: must not be `127.0.0.1` if using direct `:3210` access
- Check listening socket: `ss -ltnp | grep 3210`

### B) Cannot resolve hostname
- Use IP from `tailscale ip -4`
- Verify both devices are in same Tailnet account
- Enable MagicDNS in Tailnet admin if using hostnames

### C) Sheet writes fail after deployment
- Re-check `GOOGLE_*` env vars
- Confirm service account has **Editor** access to the Sheet
- Ensure tab names match exactly: `Transactions`, `Rules`, `Categories`

### D) Wrong dates on saved records
- Confirm `APP_TIMEZONE=Asia/Manila` (or `TZ=Asia/Manila`) is set for runtime process
- Restart app after env changes

---

## 7) Security notes (single-user)
- Keep access **Tailnet-only**; do **not** open firewall/public NAT for port `3210`
- Never enable `tailscale funnel` for this MVP unless explicitly needed
- Restrict Tailnet membership to your own devices
- Store Google service-account key outside git; rotate keys if exposed
- Prefer `tailscale serve` HTTPS endpoint when feasible

---

## 8) Quick rollback
- Stop app process (Ctrl+C / service stop)
- Remove serve config if used:
  ```bash
  sudo tailscale serve reset
  ```
- Optional disconnect host:
  ```bash
  sudo tailscale down
  ```
