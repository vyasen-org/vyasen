# Authentication API

This module provides email one-time-code sign-in, Google OAuth/OIDC, Google One
Tap, explicit Google identity linking, and opaque cookie-backed sessions. User
accounts are global identities: authentication does not require or assign a
`school_id`, tenant, membership, or role. School access must be granted later by
an authorized onboarding or invitation workflow.

## Local setup

1. Copy the root `.env.example` to `.env`.
2. Replace `AUTH_CODE_HASH_SECRET`, `AUTH_STATE_SECRET`, and
   `AUTH_RATE_LIMIT_SECRET` with separate values from
   `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
3. Configure `DATABASE_URL` with a PostgreSQL runtime role and run
   `pnpm --filter @school-sms/database migrate`.
4. Configure SMTP to enable email-code delivery. Configure a Google OAuth
   client ID and secret to enable Google OAuth and One Tap; register
   `GOOGLE_REDIRECT_URI` as an authorized redirect URI and add the web origin
   to the Google client’s authorized JavaScript origins.
5. Start the API with `pnpm --filter @school-sms/api dev`.

Production must use HTTPS for both API and web origins. Keep the migration
connection in `MIGRATION_DATABASE_URL`, separate from the runtime `DATABASE_URL`.
The runtime database role should not own tables or have `BYPASSRLS`.
`TRUST_PROXY` must contain only explicitly trusted proxy addresses/CIDRs.
Configure `SESSION_COOKIE_DOMAIN` and `SESSION_COOKIE_SAME_SITE` for the
deployment topology; cross-site cookies require `SameSite=None` and HTTPS.

## Tables

The migration in
[`packages/database/src/migrations/001_create_auth_tables.ts`](../../packages/database/src/migrations/001_create_auth_tables.ts)
is the canonical schema.

| Table | Purpose and important constraints |
| --- | --- |
| `users` | UUID `id`; normalized, unique `email`; `email_verified_at`, nullable `name` and `image`, checked `status`, `created_at`, `updated_at`, and `last_login_at`. No school/tenant column. |
| `auth_identities` | UUID `id`, cascading `user_id`, checked `provider` (`email` or `google`), provider subject, `created_at`; unique `(provider, provider_subject)` and `(user_id, provider)`. |
| `email_verification_codes` | UUID `id`, normalized email, HMAC-SHA-256 `code_hash` only, checked `purpose`, `expires_at`, `consumed_at`, bounded `attempt_count`, and `created_at`. |
| `sessions` | UUID `id`, cascading `user_id`, unique SHA-256 `token_hash`, IP/user-agent/device metadata, `created_at`, `last_active_at`, `expires_at`, and `revoked_at`. |
| `auth_rate_limits` | HMAC-keyed shared counters so limits apply across API instances without storing raw emails/IPs. Required for multi-instance brute-force protection. |
| `auth_nonces` | Hashed, expiring, single-use Google One Tap nonces; required to prevent credential replay. |

All timestamps use `timestamptz`. The migration creates lookup, expiry, and
active-session indexes. An hourly bounded cleanup removes expired codes/nonces/
rate buckets and sessions more than 30 days past expiry or revocation. Consumed
codes and nonces are retained for at most 24 hours for short-term replay/abuse
evidence. Set backups and retention according to the deployment’s privacy
policy.

Authentication tables are global, not school-owned, so they do not use tenant
RLS. Any future school-owned tables must have `school_id`, tenant-scoped
constraints, and RLS as required by repository rules.

## Exact flows

### Email code

1. `POST /api/v1/auth/email/codes` accepts an email. An atomic PostgreSQL
   limiter enforces 20 requests/IP/hour, 5/email/hour, and a 2-minute
   email resend cooldown. The service generates a six-digit code with
   `crypto.randomInt`, HMACs it using `AUTH_CODE_HASH_SECRET`, invalidates
   previous open codes, and stores the hash with a 10-minute expiry.
2. SMTP delivery happens after the insert transaction commits. If delivery
   fails, the challenge is consumed and the API returns an explicit 503. On
   success the API returns a challenge ID and the same generic message for
   existing and new email addresses.
3. `POST /api/v1/auth/email/sessions` takes the challenge ID, email, and code.
   The service rate-limits by IP/email, then in one transaction locks the code
   row `FOR UPDATE`, checks expiry/consumption/attempts with a constant-time
   hash comparison, increments and consumes failed attempts, and consumes a
   valid code.
4. In that transaction it creates a user if needed, marks the email verified,
   links the proven email identity, updates `last_login_at`, and creates the
   session. The unique email constraint resolves concurrent account creation;
   the code row lock prevents two concurrent requests from consuming one code.
5. Session creation locks the user row, locks active session rows, revokes the
   oldest sessions if needed, and inserts the new session. The transaction
   commits before the raw token is set in the HttpOnly cookie. Only its SHA-256
   hash is stored.

Verification allows five attempts per code. Invalid, expired, consumed, and
wrong-email challenges receive the same verification error. Email delivery
responses do not disclose whether an account exists.

### Google OAuth/OIDC and One Tap

1. OAuth starts at `GET /api/v1/auth/google/authorize`. The API issues a signed,
   HttpOnly short-lived state cookie and sends the browser to Google with
   `state`, `nonce`, and PKCE S256.
2. The callback exchanges the authorization code and verifies the signed ID
   token with Google’s keys. It checks signature, issuer, client audience,
   expiration, verified email, and OAuth nonce before resolving identity.
3. `POST /api/v1/auth/google/one-tap` accepts a Google credential. The web app
   first obtains a short-lived one-use nonce from `GET
   /api/v1/auth/google/nonce`; that nonce is included in the credential and
   atomically consumed with identity resolution and session creation.
4. If `(google, subject)` already exists, sign in to its owning user. If it is
   new and the verified email is unused, create the user and Google identity in
   one transaction. If the email already belongs to another account, do not
   auto-link; return `identity_link_required`.
5. An authenticated user can explicitly link a verified Google credential with
   `POST /api/v1/auth/google/identities`. An identity cannot be transferred from
   another user. This endpoint requires the signed-in session and trusted web
   origin.

### Sessions

- Cookies are HttpOnly, `SameSite`-configured, and Secure in production. The
  raw token is never returned to JavaScript or stored in PostgreSQL.
- Sessions expire after 30 days and are checked for expiry/revocation on every
  authenticated request.
- A user may have at most five active sessions. The user-row lock serializes
  simultaneous logins; the oldest active session is revoked before a sixth is
  inserted.
- `GET /api/v1/auth/sessions` lists the current user’s sessions;
  `DELETE /api/v1/auth/sessions/:sessionId` revokes one owned session;
  `DELETE /api/v1/auth/session` logs out the current session; and
  `DELETE /api/v1/auth/sessions` logs out all sessions.
- Mutating API calls require a configured `Origin`. CORS allows only configured
  web origins. Configure a trusted proxy allowlist before relying on forwarded
  IP addresses.
