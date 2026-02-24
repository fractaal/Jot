# Idris Jobs Dashboard

Read-only web UI to view Idris job files (`/root/.openclaw/workspace/jobs/*.md`).

## Run

```bash
cd /root/.openclaw/workspace/jobs-dashboard
npm start
```

Defaults:
- Binds to `127.0.0.1:3131`

## Access

Recommended: SSH tunnel

```bash
ssh -L 3131:127.0.0.1:3131 root@<saturn>
```

Then open: http://127.0.0.1:3131

## Config

Environment variables:
- `HOST` (default `127.0.0.1`)
- `PORT` (default `3131`)
- `JOBS_DIR` (default `/root/.openclaw/workspace/jobs`)

## Security

This is intentionally read-only and binds to localhost by default. Do not expose publicly without auth + TLS.
