---
title: Current repository architecture
description: What the Vyasen repository implements today and how its applications are organized.
---

# Current repository architecture

**Status: Implemented baseline, as represented in this repository.** This page
describes the code and repository documentation reviewed for this Project Hub.
It is not a security audit or an assurance that the product is production-ready.

## Monorepo structure

Vyasen is a pnpm workspace managed by Turborepo.

| Path                 | Current responsibility                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`           | React 19 and Vite application using TanStack Router and Query. It contains the current user interface, authentication flows, and browser-local appearance settings. |
| `apps/api`           | Fastify 5 API. Its documented active feature is authentication: email one-time codes, Google sign-in, identity linking, and cookie-backed sessions.                 |
| `packages/contracts` | Shared Zod schemas and TypeScript contracts used across application boundaries.                                                                                     |
| `packages/database`  | PostgreSQL access through Kysely and versioned migrations.                                                                                                          |
| `apps/docs`          | Static Docusaurus Project Hub; public documentation does not require the application API or database.                                                               |

## Current API request flow

The current API follows a feature-first, layered direction:

```text
HTTP route → controller → service → repository → PostgreSQL
                            ↘ provider adapters (SMTP, Google)
```

Routes define request and response boundaries; controllers handle HTTP
concerns; services implement use cases and transaction policy; repositories
perform database access. Shared request/response contracts live in
`packages/contracts`.

The API currently does **not** create an institution, assign workspace
membership, or grant an institutional role. Authentication is not equivalent to
institutional authorization.

## Product direction versus implemented code

The product references describe a global identity, personal area, workspaces,
verified memberships, contextual authorization, document governance, and an
extension ecosystem. These are **product directions and requirements**, not
claims that those complete capabilities exist today.

The [Phase 1 database design](./phase-1-database-design.md) is a proposed
implementation reference. Consult the current migrations and API before
describing any table or flow as implemented.

## Related source documentation

- [Root README](https://github.com/vyasen-org/vyasen/blob/develop/README.md)
- [API architecture and setup](https://github.com/vyasen-org/vyasen/blob/develop/apps/api/README.md)
- [Development setup](https://github.com/vyasen-org/vyasen/blob/develop/docs/development.md)
