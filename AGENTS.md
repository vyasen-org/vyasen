# AGENTS.md — Vyasen Repository Instructions

Vyasen is an open-source, multi-tenant Education Operating System connecting
educational institutions and individuals through global identities, verified
institutional relationships, and role-specific workspaces.

Its audiences include primary, secondary, and higher-secondary schools;
colleges and universities; and educational groups, trusts, and chains.
Individuals may maintain a global personal profile independently of an
institution. Support standalone institutions and parent-governed institutions
with configurable delegation and strict permission boundaries. Preserve the
open-core direction. Do not describe Vyasen exclusively as a School Management
System SaaS, and do not present planned capabilities as implemented.

## Authority and status

Always distinguish approved specification, current implementation actually
verified in the repository, and explicitly deferred future scope. Documentation,
database tables, and historical migrations do not prove completion. If an
approved task requests complete scope, implement that scope rather than only
the existing foundation. Locate the authoritative document when a path changes.

Use capability names such as `Identity & Authentication Architecture`,
`Product Vision`, `Product Requirements`, and `Institutional Governance`.
Do not use temporary labels such as “Phase 1 Database” as permanent
architecture names; keep software versioning separate from architecture names.

## Non-negotiable rules

- Security before convenience; correctness before optimization.
- Enforce authentication, authorization, and tenant isolation on the server.
- Never trust client-supplied roles, institution IDs, permissions, or ownership.
- Validate external input at runtime with Zod.
- Never expose secrets, internal errors, SQL details, tokens, or unrestricted
  database records.
- Do not invent APIs, environment variables, fields, dependencies, or provider
  capabilities.
- Do not claim tests, builds, migrations, integrations, or security checks
  passed without verifying them.
- Keep changes focused and free of unrelated modifications.

## Approved stack and boundaries

- Turborepo and pnpm workspaces.
- React, Vite, TypeScript, TanStack Router, TanStack Query, Tailwind,
  shadcn/ui, and Radix UI.
- Node.js, TypeScript, and Fastify 5.
- Shared Zod contracts converted to JSON Schema where Fastify requires it.
- PostgreSQL 18 with Kysely.
- Redis and BullMQ, with a separate worker application.
- Private S3/R2-compatible storage and CDN delivery where appropriate.
- Docker Compose for local infrastructure and GitHub Actions for CI/CD.

```text
apps/web       Frontend UI
apps/api       Fastify HTTP API
apps/worker    BullMQ jobs and scheduled work
packages/contracts Shared Zod schemas, DTOs, and enums
packages/database Kysely types, migrations, seeds, and policies
packages/config Shared tooling configuration
```

Keep frontend, backend, database, and server-only concerns separated. Use
package exports, avoid circular dependencies, and do not expose database types
as public API contracts.

## Identity & Authentication Architecture

The approved Identity & Authentication specification is authoritative when code
or historical migrations conflict with it. The approved model contains:

1. `users`
2. `personal_profiles`
3. `user_contacts`
4. `auth_identities`
5. `auth_credentials`
6. `auth_challenges`
7. `sessions`
8. `auth_nonces`
9. `auth_rate_limits`
10. `auth_security_events`

It requires global UUID users, a separate personal profile for every account,
independent personal contacts, separately owned authentication identities,
password credentials, purpose-specific challenges, secure sessions, nonces,
rate limiting, and security events.

Approved methods are email/password, email OTP-only, phone/SMS OTP-only,
Google OAuth, and Google One Tap. GitHub and Apple are future possibilities,
not current requirements.

Current identity scope includes users, profiles, contacts, identities and
credentials, OTP verification, email/password and passwordless email, securely
gated phone/SMS, Google OAuth and One Tap, explicit account linking, sessions,
and security controls. Authentication establishes identity; it does not grant
institutional access.

Deferred scope includes institution memberships, institutional roles and
permissions, organization/workspace management, academic and administrative
modules, and verified family relationships. Do not introduce institutional
authorization into global authentication prematurely.

## Backend architecture

Use a modular monolith with feature ownership and this dependency direction:

```text
Module → Feature → Route → Controller → Service → Repository → Database
                                      ↘ Provider / Adapter / Queue / Storage
```

Routes declare HTTP details and invoke controllers; controllers translate HTTP
and write responses; services own business rules, authorization, workflows,
transactions, providers, and application errors; repositories contain Kysely
queries for their feature; providers isolate and validate third-party behavior;
workers validate jobs, reconstruct trusted context, and implement retries,
timeouts, idempotency, and failure handling.

Every endpoint is declared by a `.routes.ts` plugin. Public contracts belong in
the shared contracts package. Cross-module synchronous calls use public services
or use cases; asynchronous work uses events or queue jobs. Never import private
repositories across modules. Do not add CQRS, event sourcing, generic base
repositories, microservices, or ceremonial dependency injection without a real
problem to solve.

## Multi-tenancy and authorization

Use the canonical tenant identifier approved by the Identity, Institutional
Governance, and database specifications. Do not introduce alternate names such
as `school_id` or `institution_id` without an approved decision.

- Resolve tenant context server-side from authenticated membership.
- Treat URL, subdomain, header, cookie, body, and frontend tenant values as
  untrusted navigation context.
- Apply tenant and authorization filters to every read, write, export, report,
  cache key, file access, and queue job.
- Authorize every protected resource and operation; deny by default.
- Use PostgreSQL RLS where applicable, with transaction-local tenant context.
- The application role must not own protected tables or bypass RLS; use a
  separate migration role.
- Missing or invalid tenant context fails closed.

Test cross-tenant read, update, delete, export, file, cache, and worker denial;
class assignment restrictions; parent-child restrictions; and missing-context
failure.

## API, frontend, data, and security standards

Use versioned plural resource routes, validated path/query/body/header schemas,
sanitized centralized errors, bounded pagination, stable ordering, and shared
Zod contracts. Use TanStack Router for navigation/search parameters, TanStack
Query for server data and invalidation, React state for temporary UI state, and
React Hook Form plus Zod for forms. Reuse the existing design system, provide
loading/empty/error/unauthorized/not-found states, and maintain semantic HTML,
keyboard access, visible focus, responsive behavior, and WCAG 2.2 AA where
applicable. Frontend role previews are never authorization.

Use explicit database constraints, `timestamptz`, exact numeric money types,
transactions, concurrency controls, selected columns, and version-controlled
migrations. New migrations use timestamp-based names such as
`YYYYMMDDHHMMSS_create_identity_and_authentication_tables.ts`. Never edit an
applied production migration. Clean-slate replacement is allowed only for an
explicitly approved development schema; production and valuable shared data
require safe forward migrations. Never destructively operate on unidentified,
staging, production, or shared databases without explicit authorization.

PostgreSQL is the source of truth; Redis is not authorization. Queue jobs need
validated payloads, tenant context, bounded retries, backoff, timeouts,
concurrency limits, stable IDs where needed, idempotency, and graceful shutdown.
Use private storage, server authorization, short-lived signed URLs, content
validation, safe object keys, and restricted media delivery.

Protect sensitive educational, personal, health, document, media, and financial
data. Use secure cookies, CSRF protection, rate limits, audit events, least
privilege, synthetic development data, and no secret or token logging. Never
store payment-card data.

## Testing, completion, and workflow

Test business rules, validation, permissions, authentication, transactions,
RLS, queues, storage authorization, migrations, end-to-end journeys, and
cross-tenant denial as applicable. A successful build or unit-test suite does
not prove functional completeness.

Before completion, inspect affected code and tests; implement the smallest
complete change; add or update relevant tests; run applicable `pnpm lint`,
`pnpm typecheck`, `pnpm test`, and `pnpm build`; review authorization, tenant
isolation, SQL safety, errors, migrations, secrets, and providers; and provide
a requirement-by-requirement coverage report with evidence. Report unavailable
credentials, unverified live integrations, checks not run, limitations, and
unresolved assumptions.

Validate environment variables, keep `.env.example` sanitized, separate
development/staging/production configuration, maintain backups and restoration
tests, restrict exposed services, and use TLS. Use focused feature branches,
Conventional Commits, pull requests, and protected development branches. Do not
create commits or modify unrelated files unless explicitly requested.

Never bypass tenant isolation or RLS, trust client roles or tenant IDs,
concatenate untrusted SQL, expose secrets, use unbounded queries/uploads/jobs,
disable type safety/security checks, swallow errors, use `any` routinely,
delete tests, weaken assertions, or modify authentication, RLS, secrets, or
deployment security incidentally.
