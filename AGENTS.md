# Repository Guidelines

## Project Structure & Module Organization

- `/` is a static, dependency-free front end:
  - `index.html` (UI), `style.css` (styles)
  - `script.js` (main trainer logic), `utils.js` (shared helpers), `config.js` (constants), `api-client.js` (sync client)
  - PWA: `manifest.webmanifest`, `sw.js`, `icons/`
- `api/` is an optional Node/Express + MySQL backend for cloud sync:
  - `server.js` (local server), `index.js` (Vercel serverless entry), `routes.js`, `db.js`, `validate.js`, `security.js`
- Deployment/docs: `README.md`（含当前 Oracle VPS 生产部署说明）, `docs/`（数据库配置与各平台部署文档）, `scripts/deploy_oracle.py`, `.github/workflows/`, `docker-compose.yml`, `nginx.conf`.

## Build, Test, and Development Commands

- Front end (no build step): open `index.html`, or run `python3 server.py` and visit `http://localhost:8080`.
- API (local):
  - `cd api && npm install`
  - `npm run dev` (nodemon) or `npm start` (plain node)
- Docker (nginx + API): set DB vars in `.env`, then `docker-compose up --build`.
- Health checks: local API `GET /health`; Vercel API `GET /api/health`.

## Coding Style & Naming Conventions

- Match existing style in the file you touch (root JS uses 4-space indentation; `api/` uses 2-space).
- Use `camelCase` for functions/variables, `PascalCase` for classes, and keep shared constants in `CONFIG` (`config.js`).
- Prefer small, readable vanilla JS changes; avoid introducing a front-end build step unless it’s a deliberate project decision.

## Testing Guidelines

No automated test suite yet—please do a quick manual smoke test:

- Run a full session (start/pause/resume/finish) and verify stats + export/import.
- If sync is enabled, start the API and verify records/settings persist (DB required).

## Commit & Pull Request Guidelines

- History follows a loose Conventional Commits style (`feat:`, `fix:`, `chore:`). Prefer that format (e.g., `fix: handle offline sync`).
- PRs should include: what/why, how to test (commands + steps), and screenshots/GIFs for UI changes. Call out any deployment or env-var changes.

## Security & Configuration Tips

- Never commit secrets: keep DB credentials in `api/.env` and update `api/.env.example` when variables change.
- Front end is static—do not embed credentials in `index.html` or `*.js`.
