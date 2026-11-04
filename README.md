# Vyasen

The Vyasen monorepo uses pnpm workspaces and Turborepo. The web app uses
React 19, TanStack Router and Query; the API uses Fastify 5 and Kysely with
PostgreSQL.

## Requirements

- Node.js 24 or newer
- pnpm 12

## Getting started

```sh
pnpm install
pnpm dev
```

The Vite app runs at `http://localhost:3000`. To validate the workspace:

```sh
pnpm typecheck
pnpm build
```

Copy `.env.example` to `.env`, set the three authentication secrets to separate
random values, and configure PostgreSQL before starting the API. Configure SMTP
to send email codes; configure Google OAuth client credentials to enable Google
OAuth and One Tap. See [the API authentication guide](./apps/api/README.md) for
setup, schema, flow, and deployment details.

## Workspace layout

```text
apps/
  api/              Fastify API and email/Google authentication
  web/              React, Vite, TanStack Router and Query
packages/
  config/           Reserved for shared configuration
  contracts/        Shared Zod contracts and TypeScript types
  database/         Kysely client and versioned PostgreSQL migrations
```

The router uses a pathless authenticated route group for the dashboard and
settings pages, so their browser paths are `/dashboard` and `/settings`.
Settings include `/settings/appearance` and `/settings/sidebar`. Appearance
and sidebar preferences are validated and saved in the browser's local storage;
they are not yet synchronized between devices or stored per user or school.
The sidebar supports left, right, top, and bottom placement, and its preview
navigation changes with the selected demo role.

Authentication does not assign a school, membership, role, or permission.
Those must be granted by later school-onboarding and membership workflows;
frontend role previews are not an authorization boundary.
