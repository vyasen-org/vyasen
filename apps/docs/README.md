# Vyasen Project Hub

The Docusaurus application publishes the public Project Hub at
`https://doc.vyasen.com`. It is a static site: public documentation and generated
GitHub snapshots do not require the Vyasen API, user authentication, or a
database.

## Local development

From the repository root, using Node.js 24+ and pnpm 12:

```sh
pnpm install
pnpm --filter @vyasen/docs start
```

## Checks and production build

```sh
pnpm --filter @vyasen/docs typecheck
pnpm --filter @vyasen/docs build
```

The static output is `apps/docs/build`. The build requests public GitHub
repository and contributor data. No credentials are used. If GitHub is
unavailable, rate-limited, or returns invalid data, the build completes with
honest fallback states on the Project Hub.

## Cloudflare Pages

Create a Cloudflare Pages project (the workflow expects `vyasen-docs`) and
configure the repository’s existing deployment environment:

- Build command: `pnpm install --frozen-lockfile && pnpm --filter @vyasen/docs build`
- Build output directory: `apps/docs/build`
- Root directory: repository root
- Build environment: Node.js 24 and pnpm 12
- GitHub Actions secrets/variables: reuse `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` from the existing web deployment.

The `deploy-docs` job in `.github/workflows/deploy.yml` publishes on pushes to
`develop`. Production domain setup is an operator action: attach
`doc.vyasen.com` to the Cloudflare Pages project and configure DNS in Cloudflare.
This repository change does not deploy the site or modify DNS.

## Self-hosting and configuration

The docs app can be built independently of Cloudflare. Configure public site
metadata at build time with:

| Variable           | Default                  | Purpose                                     |
| ------------------ | ------------------------ | ------------------------------------------- |
| `DOCS_SITE_NAME`   | `Vyasen Project Hub`     | Site title                                  |
| `DOCS_URL`         | `https://doc.vyasen.com` | Canonical deployment origin                 |
| `DOCS_BASE_URL`    | `/`                      | Base path for installations under a subpath |
| `DOCS_GITHUB_ORG`  | `vyasen-org`             | Public GitHub organization                  |
| `DOCS_GITHUB_REPO` | `vyasen`                 | Public GitHub repository                    |

No secrets are needed for the public GitHub snapshot. If an operator does not
want this documentation site, they can omit its deployment; it is not required
by the native application. The repository and CI still include the docs app in
workspace validation.

## Data freshness and limits

GitHub data is fetched at build time and becomes part of the static site output.
It changes on the next successful build, not continuously. Unauthenticated
GitHub API requests are rate limited. The app does not expose a token, retry
continuously, or invent metric values when data is unavailable.
