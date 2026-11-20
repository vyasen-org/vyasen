# Development Setup

This guide sets up a local development copy of Vyasen. Run all commands from the repository root unless stated otherwise.

## Prerequisites

- **Node.js 24** or newer — check with `node --version`
- **pnpm 12** — check with `pnpm --version`. Install via `corepack enable && corepack prepare pnpm@12.16.1 --activate`
- **Docker Desktop** (or Docker Engine + Compose) for the local PostgreSQL database, or PostgreSQL 17 installed natively
- **Git**

## Clone and configure

```bash
git clone --branch develop https://github.com/vyasen-org/vyasen.git
cd vyasen
cp .env.example .env
pnpm install
```

On **Windows PowerShell**, use `Copy-Item .env.example .env` instead of `cp`.

The `.env` file holds your local secrets. Never commit it. Set the three auth secrets to separate random values:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Run this command **three times** and set `AUTH_CODE_HASH_SECRET`, `AUTH_STATE_SECRET`, and `AUTH_RATE_LIMIT_SECRET` to three different outputs.

## Start PostgreSQL

### With Docker (recommended)

```bash
docker compose up -d --wait postgres
```

The database runs on port `5432` (matching `.env.example`). Data is stored in a named Docker volume and survives restarts.

### Native PostgreSQL 17

Install PostgreSQL 17, then create a role and database:

```sql
CREATE ROLE vyasen WITH LOGIN PASSWORD 'vyasen';
CREATE DATABASE vyasen OWNER vyasen;
```

Ensure `DATABASE_URL=postgresql://vyasen:vyasen@localhost:5432/vyasen` in your `.env`.

## Apply migrations and start

```bash
pnpm db:migrate
pnpm dev
```

The Vite app is at <http://localhost:3000>. The API is at <http://localhost:4000>. The API health check is at <http://localhost:4000/api/v1/health>.

## Useful commands

```bash
pnpm dev            # Start both web and API (Turborepo parallel)
pnpm typecheck      # TypeScript type check across all packages
pnpm lint:check     # ESLint static analysis
pnpm format:check   # Prettier formatting check
pnpm format:write   # Auto-fix formatting
pnpm test           # Run API unit tests (Node built-in test runner)
pnpm build          # Build the Vite web app for production
pnpm db:migrate     # Apply pending database migrations
```

## Git workflow

Commits directly to `develop` are blocked by the Husky pre-commit hook. Always use a feature branch:

```bash
git checkout -b feat/my-feature
# make changes
git add .
git commit -m "feat: add my feature"
git push origin feat/my-feature
# open a Pull Request on GitHub
```

The pre-commit hook runs `lint-staged` (Prettier + ESLint on changed files).  
The pre-push hook runs the API unit tests before pushing any branch.

## Stopping the development environment

```bash
# Stop the app: Ctrl+C in the terminal running pnpm dev

# Stop Docker database (data is preserved in the volume):
docker compose down

# Remove ALL data and restart fresh:
docker compose down -v
pnpm db:migrate
```

> **Windows / WSL memory note:** After stopping, run `docker desktop stop` and `wsl --shutdown` to fully release memory.

## Environment variables

All environment variables are documented in [`.env.example`](../.env.example).  
Production secrets are never committed — they go in Render's environment dashboard and GitHub Actions Secrets.  
The committed [`.env.production`](../.env.production) holds only public build-time values (`VITE_*`) that are safe to include in browser JavaScript.
