---
title: Development status and roadmap
description: Current repository status and product areas that remain planned or deferred.
---

# Development status and roadmap

Vyasen is in early development. The product reference set is an initial,
evolving baseline; it does not define release dates, committed milestones, or
an MVP feature list.

## Implemented in the repository

The current codebase includes:

- A React/Vite web application and a Fastify API in a pnpm/Turborepo monorepo.
- Initial authentication capabilities documented by the API: email one-time
  codes, Google sign-in, Google One Tap, Google identity linking, and
  cookie-backed sessions.
- A PostgreSQL/Kysely persistence layer and versioned migrations.
- Browser-local appearance and sidebar preferences in the web application.

These are statements about code and repository documentation, not a guarantee
of production readiness or a complete release.

## Planned product direction

The evolving product references describe:

- A personal area and lifelong education portfolio.
- Institutional and parent-organization workspaces.
- Verified memberships and contextual, scoped authorization.
- Institutional academic and administrative capabilities.
- Issuer-governed document sharing and verification.
- A modular platform and controlled extension ecosystem.
- Hosted and self-hosted deployment directions.

The presence of a design document is not evidence that these capabilities are
implemented.

## Deferred and open

The initial requirements explicitly leave the following for later design:

- The first release feature set, delivery sequence, and measurable milestones.
- Detailed membership lifecycle, role/permission model, and policy inheritance.
- Full document lifecycle and extension runtime/security model.
- Operational service targets and deployment/edition differences.

See the [scope and boundaries](../product/scope-and-boundaries.md) and
[initial requirements](../product/initial-requirements.md) for the source
material. Dates and progress indicators will be added only when maintainers
have confirmed them.
