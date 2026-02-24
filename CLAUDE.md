# CLAUDE.md

## What this project is

Jot is a user-facing expense tracking app. It's not a developer tool. Real people use this to manage their money. Every decision should reflect that.

## Design principles

- **User-facing settings belong in the UI, not env vars.** If a user would ever want to change something (budget, categories, currency, display preferences), it must be editable from the app itself. Environment variables are for infrastructure config (API keys, database URLs, ports) — never for user preferences.
- **Mobile-first.** Most users will use this on their phone. The primary action (logging an expense) should be the most accessible thing on screen. Bottom of viewport = thumb zone = priority.
- **Don't over-engineer, but don't under-think.** Before implementing, ask: "Would I actually want to use this?" If the answer involves restarting a server or editing a .env file, the answer is wrong.
- **Respect the existing stack.** This is vanilla JS + Express + Google Sheets. Don't introduce frameworks, build steps, or complexity unless explicitly asked.

## Technical notes

- Backend: Express.js (`src/app.js`, `src/server.js`)
- Frontend: Vanilla JS (`public/app.js`), plain CSS (`public/styles.css`), single HTML file (`public/index.html`)
- Data store: Google Sheets (with memory store fallback)
- No build step. No bundler. No React.
- Tests: `npm test` (vitest)

## Common mistakes to avoid

- Don't expose user-configurable values only through env vars or server config
- Don't forget mobile when making layout changes — test both viewports mentally
- Don't add a new API endpoint when you can piggyback on an existing response
- Don't propose UI changes without reading the current CSS and understanding the responsive breakpoints (768px desktop, 479px small mobile)
