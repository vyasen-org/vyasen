# Operations Guide

Deployment, secrets management, and infrastructure for the Vyasen monorepo.

## Architecture Overview

```
vyasen.com (Cloudflare Pages — static Vite SPA)
    │
    │  API calls to api.vyasen.com
    ▼
api.vyasen.com (Cloudflare DNS → Render Web Service — Fastify API)
    │
    │  SQL over TLS
    ▼
Neon PostgreSQL (serverless, auto-suspends when idle)
```

| Layer       | Platform             | URL              | Free Tier                       |
| :---------- | :------------------- | :--------------- | :------------------------------ |
| Frontend    | Cloudflare Pages     | `vyasen.com`     | ✅ Unlimited bandwidth          |
| Backend API | Render (Web Service) | `api.vyasen.com` | ✅ Spins down after 15 min idle |
| Database    | Neon PostgreSQL      | internal         | ✅ 0.5 GB, auto-suspends        |

---

## First-Time Platform Setup

### 1. Neon — PostgreSQL Database

1. Sign up at <https://neon.tech> with GitHub (no credit card).
2. Create a project named `vyasen`, region closest to your users.
3. From the **Connection Details** panel, copy the **Connection string** (pooled).
   It looks like: `postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require`
4. Run initial migrations from your local machine:
   ```bash
   MIGRATION_DATABASE_URL="postgresql://..." pnpm db:migrate
   ```
   On Windows PowerShell:
   ```powershell
   $env:MIGRATION_DATABASE_URL="postgresql://..."
   pnpm db:migrate
   ```

### 2. Render — Backend API

1. Sign up at <https://render.com> with GitHub (no credit card).
2. Click **New +** → **Web Service** → connect the `vyasen-org/vyasen` GitHub repo.
3. Configure:
   - **Name:** `vyasen-api`
   - **Region:** nearest to your users
   - **Branch:** `develop`
   - **Build Command:** `corepack enable && pnpm install --frozen-lockfile`
   - **Start Command:** `pnpm --filter @vyasen/api start`
   - **Plan:** Free
4. Under **Environment** → add all variables listed in [§ Render Environment Variables](#render-environment-variables).
5. Under **Settings** → **Deploy Hook** → copy the URL. This becomes the `RENDER_DEPLOY_HOOK` GitHub secret.
6. Under **Settings** → **Health Check Path** → set `/api/v1/health`.
7. **Auto-Deploy:** Disable it — GitHub Actions controls deployments.

#### Render Environment Variables

| Variable                   | Value                                                                                      |
| :------------------------- | :----------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | `production`                                                                               |
| `API_HOST`                 | `0.0.0.0`                                                                                  |
| `API_PORT`                 | `10000`                                                                                    |
| `API_PUBLIC_ORIGIN`        | `https://api.vyasen.com`                                                                   |
| `WEB_ORIGINS`              | `https://vyasen.com,https://www.vyasen.com`                                                |
| `DATABASE_URL`             | Neon connection string                                                                     |
| `AUTH_CODE_HASH_SECRET`    | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `AUTH_STATE_SECRET`        | (generate separately)                                                                      |
| `AUTH_RATE_LIMIT_SECRET`   | (generate separately)                                                                      |
| `APP_NAME`                 | `Vyasen`                                                                                   |
| `SESSION_COOKIE_SAME_SITE` | `lax`                                                                                      |
| `SESSION_COOKIE_DOMAIN`    | `.vyasen.com`                                                                              |
| `TRUST_PROXY`              | `1`                                                                                        |
| `GOOGLE_CLIENT_ID`         | From Google Cloud Console (optional)                                                       |
| `GOOGLE_CLIENT_SECRET`     | From Google Cloud Console (optional)                                                       |
| `SMTP_HOST`                | Your SMTP provider host                                                                    |
| `SMTP_PORT`                | `587`                                                                                      |
| `SMTP_USER`                | Your SMTP username                                                                         |
| `SMTP_PASSWORD`            | Your SMTP password                                                                         |
| `SMTP_FROM`                | `no-reply@vyasen.com`                                                                      |

> **Note on `TRUST_PROXY`:** Render sits behind a load balancer. Setting `TRUST_PROXY=1` tells Fastify to read the real client IP from `X-Forwarded-For`, which is used for rate limiting.

### 3. Cloudflare Pages — Frontend

1. In the **Cloudflare Dashboard** → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select `vyasen-org/vyasen`.
3. Configure:
   - **Project name:** `vyasen-web`
   - **Production branch:** `develop`
   - **Framework preset:** None
   - **Build command:** `pnpm --filter @vyasen/web build`
   - **Build output directory:** `apps/web/dist`
   - **Root directory:** `/` (leave blank)
4. In GitHub repository **Settings** → **Secrets and variables** → **Actions**
   → **Variables**, set:
   - `VITE_APP_NAME` = your deployment’s display name (defaults to `Vyasen`)
   - `VITE_API_BASE_URL` = `https://api.vyasen.com`
     The frontend branding value is embedded at build time. Set `APP_NAME` in
     the API hosting environment too; it determines the API email brand and
     auth-cookie names.
5. **Disable** automatic deployments — GitHub Actions handles this.
   Under **Settings** → **Builds & deployments** → turn off auto-deploy.

> **Important:** `apps/web/public/_redirects` is already committed to the repo. It tells Cloudflare Pages to serve `index.html` for all routes, so TanStack Router can handle client-side navigation (e.g. `/dashboard`, `/settings`).

### 4. Domain Setup — `vyasen.com`

> These DNS records are created in your Cloudflare DNS dashboard.

#### Frontend — `vyasen.com` and `www.vyasen.com`

Cloudflare Pages handles this automatically when you add a custom domain:

1. In Cloudflare Pages → your project → **Custom domains** → **Set up a custom domain**.
2. Add `vyasen.com` and `www.vyasen.com`.
3. Cloudflare auto-creates the DNS records (proxied through Cloudflare CDN).

#### Backend — `api.vyasen.com`

1. In Render, go to your service → **Settings** → **Custom Domains** → add `api.vyasen.com`.
2. Render gives you a target hostname like `vyasen-api.onrender.com`.
3. In Cloudflare DNS, add:
   - **Type:** `CNAME`
   - **Name:** `api`
   - **Target:** `vyasen-api.onrender.com`
   - **Proxy status:** Proxied (orange cloud) ✅
4. In Cloudflare → **SSL/TLS** → set mode to **Full** (not Flexible, not Full Strict).
5. Wait for Render to verify the domain (~5 minutes).

> **Why Full (not Full Strict)?** Full Strict requires a valid CA-signed cert on Render's origin for `api.vyasen.com`. Render issues the cert after domain verification, which takes a few minutes. Full mode works while Render provisions the cert.

---

## GitHub Repository Configuration

### Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret                   | Where to find it                                                                    |
| :----------------------- | :---------------------------------------------------------------------------------- |
| `MIGRATION_DATABASE_URL` | Neon → Connection Details → Connection string                                       |
| `RENDER_DEPLOY_HOOK`     | Render → Service → Settings → Deploy Hook                                           |
| `CLOUDFLARE_API_TOKEN`   | Cloudflare → Profile → API Tokens → Create Token → "Edit Cloudflare Pages" template |

### Variables (Settings → Secrets and variables → Actions → Variables)

| Variable                | Value                                              |
| :---------------------- | :------------------------------------------------- |
| `VITE_API_BASE_URL`     | `https://api.vyasen.com`                           |
| `API_HEALTHCHECK_URL`   | `https://api.vyasen.com/api/v1/health`             |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Overview → Account ID (right sidebar) |

### Branch Protection (Settings → Branches → Add rule for `develop`)

- ✅ Require a pull request before merging
- ✅ Require status checks to pass: **`Lint, Typecheck, Test & Build`**
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

---

## Deployment Flow (after initial setup)

```
Contributor opens PR
    │
    ▼
ci.yml runs (typecheck + ESLint + tests + build)
    │
    ├── ❌ Fails → Contributor fixes; merge blocked
    └── ✅ Passes → Maintainer reviews and merges into develop
                        │
                        ▼
                 deploy.yml runs
                        │
                 ┌──── migrate job ────┐
                 │  pnpm db:migrate    │
                 │  (Neon PostgreSQL)  │
                 └────────┬───────────┘
                          │ success
               ┌──────────┴──────────┐
               ▼                     ▼
        deploy-api             deploy-web
     Render deploy hook    Cloudflare Pages build
     (API restarts with    (Vite bundle deployed
      new code)             to edge CDN)
               │                     │
               └──────────┬──────────┘
                          ▼
                 🚀 vyasen.com is live
```

---

## Running Migrations in Production

Migrations run automatically in the CD pipeline (`deploy.yml → migrate` job). To run them manually from your local machine against the production database:

```bash
MIGRATION_DATABASE_URL="postgresql://..." pnpm db:migrate
```

> Never run migrations against production without backing up the database first. Neon provides point-in-time recovery in its dashboard.

---

## Monitoring

- **Render logs:** Render Dashboard → Service → Logs (real-time)
- **Cloudflare Pages build logs:** Cloudflare Dashboard → Workers & Pages → your project → Deployments
- **GitHub Actions:** GitHub → Actions tab → see CI and Deploy workflow runs
- **API health check:** `https://api.vyasen.com/api/v1/health` returns `{"status":"ok"}`
- **Neon metrics:** Neon Dashboard → your project → Monitoring

---

## Free Tier Behavior

| Concern               | Reality                                                                               |
| :-------------------- | :------------------------------------------------------------------------------------ |
| Render API cold start | After 15 min idle, the first request takes ~30–50 s. Subsequent requests are instant. |
| Neon auto-suspend     | Database suspends after ~5 min idle. Wakes in <1 s on the next query.                 |
| Cloudflare Pages      | Always-on global CDN. No cold start. Unlimited bandwidth.                             |
| Session cookies       | Sessions survive cold starts — they're stored in Neon, not in the Render process.     |
