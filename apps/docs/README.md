# Vyasen Project Hub

The Docusaurus application publishes the public Project Hub at
`https://docs.vyasen.com`. It is a static site: public documentation and generated
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

The repository deploys the docs with the `deploy-docs` job in
`.github/workflows/deploy.yml`; it builds the site and runs
`wrangler pages deploy apps/docs/build --project-name=vyasen-docs` on pushes to
`develop`.

Create a **Cloudflare Pages** project named `vyasen-docs` using Direct Upload.
Do not configure this as a Workers project or run `wrangler deploy`: that
command deploys a Worker, while this app produces static Pages assets. The
Pages project does not need a dashboard build command, deploy command, runtime
variables, secrets, or bindings. The build runs in GitHub Actions with Node.js
24 and pnpm 12.

Configure GitHub Actions with:

- `CLOUDFLARE_API_TOKEN` as a secret with the account-level Cloudflare Pages
  edit permission.
- `CLOUDFLARE_ACCOUNT_ID` as a repository or environment variable.

The workflow expects those names and deploys to the Pages project
`vyasen-docs`. Set the Pages production branch to `develop` to match the
workflow trigger. Attach `docs.vyasen.com` to the Pages project and configure
DNS in Cloudflare. These are operator actions; this repository does not deploy
the site or modify DNS by itself.

If configuring a Git-connected Pages build instead of using the existing
workflow, use the repository root as the build root, build command
`pnpm install --frozen-lockfile && pnpm --filter @vyasen/docs build`, and output
directory `apps/docs/build`. Do not enable both deployment paths at once.

## Self-hosting and configuration

The docs app can be built independently of Cloudflare. Configure public site
metadata at build time with:

| Variable           | Default                   | Purpose                                     |
| ------------------ | ------------------------- | ------------------------------------------- |
| `DOCS_SITE_NAME`   | `Vyasen Project Hub`      | Site title                                  |
| `DOCS_URL`         | `https://docs.vyasen.com` | Canonical deployment origin                 |
| `DOCS_BASE_URL`    | `/`                       | Base path for installations under a subpath |
| `DOCS_GITHUB_ORG`  | `vyasen-org`              | Public GitHub organization                  |
| `DOCS_GITHUB_REPO` | `vyasen`                  | Public GitHub repository                    |

No secrets are needed for the public GitHub snapshot. If an operator does not
want this documentation site, they can omit its deployment; it is not required
by the native application. The repository and CI still include the docs app in
workspace validation.

## Data freshness and limits

GitHub data is fetched at build time and becomes part of the static site output.
It changes on the next successful build, not continuously. Unauthenticated
GitHub API requests are rate limited. The app does not expose a token, retry
continuously, or invent metric values when data is unavailable.
