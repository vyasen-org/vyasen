# Vyasen API Agent Instructions

These instructions apply to every file under `apps/api`. Task-specific user
instructions take precedence. Unless a task explicitly requests an API or
behavior change, preserve existing behavior and public contracts.

## Architecture

Use a modular monolith with feature-oriented ownership and this dependency flow:

```text
Route → Controller → Service → Repository → Database
                         ↘ Provider / Adapter / Email / SMS / Storage / Queue
```

Routes own HTTP configuration, schemas, hooks, OpenAPI metadata, and endpoint
registration. Controllers orchestrate HTTP input and output. Services own
business rules, workflows, authorization decisions, and transaction
coordination. Repositories own Kysely database access. Providers isolate
external integrations such as email, SMS, and Google.

Keep module boundaries explicit and use the smallest structure that fits the
feature. Feature folders may group independent workflows; small features can
remain flat. Do not add empty or ceremonial files, generic repositories,
excessive dependency injection, CQRS, microservices, or unrelated abstractions.
Each module's public entry point exports only public services or use cases.
Never import another module's private repository or query its tables directly.

### Layer responsibilities

- **Routes:** declare URL, method, request/response schemas, OpenAPI metadata,
  middleware/pre-handlers, and controller. No SQL, Kysely, repository calls,
  transactions, provider calls, or multi-step workflows.
- **Controllers:** translate HTTP input into transport-independent service
  input and write status, headers, cookies, and response. No repository,
  database executor, transaction, or reusable business workflow.
- **Services:** own business policy, authorization, use cases, transactions,
  provider orchestration, and domain errors. Receive values rather than
  Fastify request/reply objects.
- **Repositories:** own Kysely reads/writes for tables belonging to their
  feature. They persist and retrieve data; they do not decide product policy
  or call Fastify.
- **Providers/adapters:** isolate and validate untrusted third-party behavior;
  services decide whether and how to use provider results.

Every endpoint is declared by a `.routes.ts` plugin and delegates to a
controller. Follow the app's route registration convention and preserve unique
paths and API versioning.

## Identity & Authentication Architecture

The approved Identity & Authentication specification is authoritative for
intended behavior and schema. Existing code and historical migrations are not
authoritative when they conflict with that specification. Distinguish approved
requirements, current verified implementation, and deferred scope. Do not
describe incomplete code as the final architecture or limit an approved
complete implementation task to the existing foundation.

The required authentication methods are:

1. Email/password signup, with email OTP verification before password setup.
2. Email/password sign-in.
3. Email OTP-only signup and sign-in.
4. Phone/SMS OTP-only signup and sign-in.
5. Google OAuth.
6. Google One Tap.
7. Explicit secure authentication method linking.
8. Personal profile creation and management.
9. Personal contact verification and management.
10. Session lifecycle and security controls.

The approved data model contains `users`, `personal_profiles`,
`user_contacts`, `auth_identities`, `auth_credentials`,
`auth_challenges`, `sessions`, `auth_nonces`, `auth_rate_limits`, and
`auth_security_events`. The specification defines columns, constraints,
indexes, and relationships; do not invent schema details from this summary.
The obsolete six-table design is not an architectural requirement.

### Identity invariants

- A global user has an immutable UUID and a personal profile created with the
  account.
- Each account has at least one uniquely owned authentication identity.
- Personal contacts are separate from authentication identities and do not
  grant login access by themselves.
- Never silently share identities or merge accounts because email or phone
  values match.
- Google OAuth and One Tap use the same identity model, keyed by Google's
  stable subject identifier.
- Linking a method requires explicit secure verification; never remove the
  last usable authentication method.
- Provider-supplied names are profile suggestions, not verified legal identity.
- Profiles use first name, optional middle name, and surname. Contacts support
  independently verified email and phone values, with at most one primary per
  type.
- Profile and contact operations require authorization for the owning account.
  Institutional contacts and institutional permissions are outside this
  identity scope.

Authentication establishes identity; it does not grant institutional access.
Do not introduce institutional memberships, RBAC, academic modules, or family
verification into identity work without a separate approved task.

## Authentication security requirements

Enforce the following on the server:

- Secure password hashing and verification.
- Purpose-, destination-, identity-, and channel-bound OTP challenges.
- Expiration, attempt caps, resend controls, and rate limits.
- Atomic, single-use challenge consumption and short-lived single-use proofs
  where a multi-step flow requires them.
- Secure Google token validation, OAuth state/nonce validation, and replay
  prevention.
- Hashed session tokens, secure cookies, session expiry and revocation, and
  CSRF protection where applicable.
- Disabled-account checks and account-specific authorization.
- Security event recording and sensitive-data redaction.
- Generic responses when needed to prevent account enumeration.

Never trust browser-supplied identity, authorization, or provider claims
without server verification. Preserve security-sensitive ordering and
transaction/concurrency protections.

### SMS availability

Phone authentication is an approved capability. Isolate delivery behind a
provider abstraction. If credentials or provider readiness are unavailable,
the server must reject SMS operations through an enforced feature gate. Do not
use insecure bypasses or hardcoded production OTPs. Tests may use an isolated
fake provider; other authentication methods must remain functional.

## Contracts and API completeness

Public request/response schemas and types belong in the shared contracts
package. Validate API inputs and outputs using repository conventions and keep
database details out of routes and controllers. Implement all affected routes,
controllers, services, repositories, middleware, contracts, error handling,
and provider integrations for a requested backend capability. A service method
alone is not a completed API capability. Do not invent unsupported frontend
behavior or public contracts.

## Database and migrations

- Use PostgreSQL 18 and Kysely.
- Use explicit keys, foreign keys, unique/check constraints, and
  `timestamptz` for absolute timestamps.
- Use transactions for atomic workflows and locks or concurrency controls
  where required.
- Never hold a transaction open during slow external calls.
- New migration filenames must be timestamp-based and describe the operation,
  for example `YYYYMMDDHHMMSS_create_identity_and_authentication_tables.ts`.
- Never edit an already-applied production migration.
- For a specifically authorized clean-slate development migration task, old
  schema and migrations need not remain backward-compatible. This exception
  does not apply to production or other database changes.
- Preserve production/shared migration history and use safe forward migrations.
- Never perform destructive operations against unidentified, staging,
  production, or shared databases without explicit authorization.

## Testing and Definition of Done

Test behavior and security boundaries with appropriate:

- Unit tests.
- API route tests.
- Database integration tests.
- Transaction and concurrency tests.
- Authentication security and session lifecycle tests.
- Provider failure tests.
- Cross-account authorization tests.

A passing typecheck or existing unit-test suite alone does not prove full
implementation. For backend features used by frontend journeys, verify shared
contract compatibility and frontend consumers. Do not call an end-to-end
feature complete when only its backend foundation exists.

Before a backend change, inspect relevant routes, controllers, services,
repositories, providers, contracts, middleware, and tests; search imports and
route registration; preserve unrelated work; and identify behavior that must
remain stable. Afterward, run applicable focused tests, API typecheck,
format/lint, route audit, and security/contract review. Report commands actually
run, pre-existing failures, limitations, and unverified integrations.

## General security and maintainability

- Resolve institutional tenant context from authenticated membership when
  working on tenant-owned features. Never trust client tenant IDs, roles, or
  permissions.
- Tenant-scope every applicable query, export, cache key, file operation, and
  job; apply RLS where specified. Global authentication does not require
  institutional context.
- Validate environment variables and never expose secrets or internal errors.
- Do not log passwords, tokens, OTPs, or unnecessary personal data.
- Keep provider calls outside database transactions where possible.
- Preserve route URLs, methods, contracts, operation IDs, status/error behavior,
  cookies, authorization, and business rules unless a change is explicitly
  requested.
- Do not delete or weaken tests to make them pass. Add regression coverage for
  fixed bugs and report unrun checks honestly.
