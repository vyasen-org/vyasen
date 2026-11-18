# Vyasen Web Agent Instructions

These instructions apply to every file and feature under `apps/web`. Follow
the root repository instructions and the approved Identity & Authentication
specification. Task-specific user instructions take precedence.

## Stack and architecture

Use React, Vite, TypeScript, TanStack Router, TanStack Query, Tailwind CSS,
shadcn/ui, Radix UI, React Hook Form, Zod, and shared API contracts. Preserve
feature-oriented organization and the existing API abstraction:

```text
UI → Query/Mutation Hook → Domain Service → Shared API Client → Backend
```

Use TanStack Query for server state and React state for temporary local UI
state. Use TanStack Router for navigation and validated/shareable URL state.
Use React Hook Form and Zod for forms. Do not duplicate server data into a
global store without a justified design. Reuse the existing service, query key,
API client, contract, and error-handling conventions. Do not introduce
competing libraries or create unnecessary layers or files.

Organize code by feature. Keep components, hooks, utilities, and styles close to
the feature that owns them. Reuse shared UI and design-system components before
creating new ones.

## Preserve Vyasen's visual identity

The existing Vyasen visual identity is authoritative. Preserve its color
palette, light and dark themes, typography, design tokens, spacing, layout,
navigation, responsive behavior, component styling, icons, branding, and
accessibility conventions.

New authentication screens must follow existing product patterns. Components
may be added, modified, refactored, or rewritten for functionality, modularity,
readability, and maintainability, provided they do not introduce an unrelated
design system or unnecessarily change the established appearance. Do not
redesign unrelated application pages.

Use Tailwind CSS v4 utilities and existing theme tokens. Use plain CSS only
when the component system and Tailwind cannot express the required behavior;
keep such CSS feature-local, narrowly scoped, and documented. Avoid global
style changes, arbitrary styling without need, duplicate controls, and new
icon or UI libraries without justification.

## Approved Identity & Authentication experience

When assigned the approved Identity & Authentication implementation, support
the complete applicable user experience:

1. Smart email/phone identifier entry.
2. Email/password signup and sign-in.
3. Email OTP-only signup and sign-in.
4. Phone/SMS OTP-only signup and sign-in.
5. Google OAuth and Google One Tap.
6. OTP verification, expiration, and resend.
7. Password creation after email verification.
8. Personal profile completion and editing.
9. Personal contact listing, addition, verification, and primary management.
10. Secure authentication method linking.
11. Session listing and revocation.
12. Loading, validation, success, error, and unavailable-provider states.

Do not treat an existing email OTP and Google sign-in modal as the complete
approved experience. Distinguish approved requirements, current verified
implementation, and deferred scope. Do not invent frontend authentication
behavior unsupported by the backend. If a requested full-stack journey depends
on missing backend behavior, report and coordinate that dependency instead of
silently presenting the journey as complete.

Personal profiles are separate from global user identity. Use first name,
optional middle name, and surname. Personal contacts are distinct from
authentication identities; possessing a contact does not by itself grant
login. Do not add institutional profile or workspace functionality to global
identity work without an approved task.

## API integration and contracts

Authentication and other frontend features must call real backend behavior
through the established service and shared contract architecture. Use shared
Zod schemas and inferred types where applicable. Do not duplicate backend
interfaces, call the API client from arbitrary components when a domain service
exists, or leave placeholder actions, disconnected buttons, mock-only success,
incomplete transitions, unhandled errors, or unverified session transitions.

The backend remains authoritative for identity, session, feature availability,
authorization, and validation. Handle API validation, authentication,
authorization, rate-limit, network, and unexpected errors through existing
error patterns with clear user-facing messages. Never expose internal errors,
tokens, or sensitive data.

## Authentication privacy and SMS availability

- Never treat the frontend as an authentication or authorization boundary.
- Smart identifier UX must not reveal account existence or linked methods
  through unrestricted discovery.
- Personal contacts must not be treated as authentication identities.
- Never log authentication tokens or secrets, or store session secrets in
  localStorage, sessionStorage, or IndexedDB.
- Keep server-controlled session state authoritative.
- Clear or invalidate sensitive cached data on logout, account switching, or
  loss of access; prevent stale data from appearing between accounts.
- Respect backend SMS availability. If SMS is unavailable, show a clear
  unavailable state, prevent misleading success, offer supported alternatives,
  and handle server rejection. Client gating is never the security boundary.

Use the existing settings layout and design system for profile, contact,
linking, and session management where practical.

## Accessibility and responsive behavior

Target WCAG 2.2 AA where applicable and follow repository conventions:

- Use semantic HTML, keyboard navigation, visible focus, accessible labels,
  appropriate contrast, and responsive layouts.
- Associate form labels, descriptions, and validation errors with controls.
- Provide accessible loading and status messages.
- Manage focus correctly in dialogs and multi-step authentication flows.
- Respect reduced-motion preferences and do not rely on color or hover alone.
- Preserve critical workflow usability on mobile and tablet.

## State, data, and performance

- Use structured query keys containing response-affecting identifiers and
  filters, including authorized institution context when applicable. Do not
  place sensitive personal data in keys.
- Invalidate or update affected queries after mutations; do not retry
  non-idempotent actions blindly.
- Clear or invalidate sensitive cache on logout, account change, or institution
  context change.
- Use server-side pagination for large datasets; never fetch an entire
  institution dataset to filter it in the browser.
- Keep bundles and requests appropriately small. Use code splitting,
  memoization, virtualization, prefetching, or new dependencies only where a
  concrete benefit exists.
- Do not claim performance improvements without observable evidence.

## Testing and Definition of Done

Write or update appropriate tests for form validation, authentication flow
transitions, OTP verification/resend/expiry, password setup, SMS availability,
Google integration boundaries, profile and contact management, account linking,
session management, loading/error states, and accessibility behavior.

For end-to-end tasks, verify actual UI → API → backend behavior. A passing
frontend build is not evidence that the complete authentication experience
works.

A frontend feature is complete only when:

- The requested UI and journeys are implemented.
- It follows the established design system and uses shared contracts.
- It integrates with the appropriate backend endpoints.
- It handles loading, errors, provider unavailability, and permission states.
- It respects session, authorization, privacy, and cache boundaries.
- Relevant automated tests and critical journey checks pass.
- Responsive behavior and accessibility are addressed.
- Unrelated functionality remains intact.

If backend functionality or provider credentials are unavailable, identify the
dependency and report which integration remains unverified. Never claim
complete functionality or a successful live integration without evidence.

## Workflow and verification

1. Inspect relevant routes, services, contracts, components, tests, and
   established visual patterns.
2. Identify the smallest maintainable change and its affected UI states,
   contracts, query keys, and journeys.
3. Implement using existing architecture and design patterns.
4. Run applicable lint, typecheck, build, and required automated tests.
5. Verify affected interactions, API behavior, loading/error states,
   permissions, responsive behavior, accessibility, and sensitive-data handling.
6. Report affected files, checks actually run, unresolved dependencies, and
   limitations.

Frontend checks cannot prove backend authorization or tenant isolation. Report
such gaps instead of claiming security. Do not remove or weaken tests, make
unrelated refactors, or claim unrun checks passed.
