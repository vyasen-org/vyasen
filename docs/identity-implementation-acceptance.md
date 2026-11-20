# Identity and Authentication Implementation

## Scope

This document describes the identity and authentication implementation
currently represented in the Vyasen repository. It is implementation
documentation, not a dated review or deployment report.

Authentication provides a global account for a person. It does not grant
institutional membership, roles, permissions or workspace access.

## Supported capabilities

| Capability                | Repository implementation                                  |
| ------------------------- | ---------------------------------------------------------- |
| Global accounts           | Users with active or disabled status.                      |
| Personal profiles         | One profile per account.                                   |
| Verified contacts         | Personal email and phone contacts with primary selection.  |
| Authentication identities | Email, phone and Google provider subjects.                 |
| Password authentication   | Optional Argon2id account credential.                      |
| Email challenges          | Purpose-bound OTP sign-in, sign-up and account operations. |
| Phone challenges          | Purpose-bound SMS OTP when the SMS provider is configured. |
| Google OAuth              | State, PKCE and server-side provider verification.         |
| Google One Tap            | Single-use nonce and server-side ID-token verification.    |
| Identity linking          | Explicit authenticated linking and unlinking protections.  |
| Sessions                  | Hashed opaque tokens in secure HttpOnly cookies.           |
| Security audit            | Allowlisted security events for supported operations.      |

## Data model

The identity schema contains:

```text
users
personal_profiles
user_contacts
auth_identities
auth_credentials
auth_challenges
sessions
auth_nonces
auth_rate_limits
auth_security_events
```

Kysely table types and PostgreSQL migrations define the exact columns,
constraints and indexes. The migration baseline and any timestamped follow-up
migrations are version-controlled in
`packages/database/src/migrations`.

## API surface

All routes are under `/api/v1/auth`.

### Account and challenge operations

- `GET /availability`
- `POST /challenges`
- `POST /challenges/verify`
- `POST /password/signup`
- `POST /password/sessions`
- `GET /account`
- `POST /profile`
- `POST /contacts/:id/primary`
- `DELETE /contacts/:id`
- `DELETE /identities/:id`

### Email and Google operations

- `POST /email/codes`
- `POST /email/sessions`
- `GET /google/nonce`
- `GET /google/authorize`
- `GET /google/callback`
- `POST /google/one-tap`
- `POST /google/identities`

### Session operations

- `GET /session`
- `DELETE /session`
- `GET /sessions`
- `DELETE /sessions/:sessionId`
- `DELETE /sessions`

Public request and response contracts are maintained in
`packages/contracts`. Routes validate requests and responses with shared Zod
schemas.

## Authentication invariants

- Identity ownership is represented by `auth_identities`, not personal contacts.
- Provider subjects are unique across accounts.
- A provider email claim does not automatically merge or link accounts.
- OTP challenges are purpose, channel and destination bound.
- Password setup consumes a separate short-lived proof after email verification.
- The password credential belongs to the account.
- Session tokens are random, opaque values; only hashes are stored.
- A final usable authentication method cannot be removed.
- Active account status is checked when an existing session is authenticated.

## Security behavior

- Passwords use Argon2id.
- OTP values are cryptographically generated and stored only as keyed hashes.
- Verification uses expiry, attempt limits and replay prevention.
- Shared database-backed rate limits protect challenge and sign-in operations.
- OAuth uses state and PKCE; One Tap uses a single-use nonce.
- Google, email and phone providers are verified or validated server-side.
- Sensitive operations use transactions and database constraints.
- Security event metadata excludes raw credentials, OTP values, bearer tokens
  and provider secrets.
- State-changing API requests require a trusted Origin.

## Testing and deployment prerequisites

The implementation requires PostgreSQL and valid environment configuration.
Email, SMS and Google features depend on their corresponding providers.

Contributors should validate:

- Fresh migration setup.
- Existing-database upgrade plans before applying migrations.
- Email, password, phone and Google flows.
- OTP replay, expiry and purpose isolation.
- Identity linking collisions and last-method protection.
- Session limits and explicit revocation.
- Cookie, CORS and trusted-origin configuration.
- Provider availability and failure behavior.

The API must not start with incomplete SMS or provider configuration where
the server policy requires the feature to be unavailable.

## Deferred scope

Institution memberships, institutional roles and permissions, family
verification, academic modules, MFA, recovery workflows and institutional
document verification are separate product capabilities. They are not
implemented by global authentication.
