# Vyasen — Product Vision

- **Document:** Product Vision
- **Version:** 0.1
- **Status:** Initial baseline; evolving
- **Last updated:** 2026-11-12

## 1. Vision statement

To build a unified, open and accessible education platform where institutions can operate their educational activities and individuals can own and carry their lifelong education identity, learning journey and achievements across institutions through a secure, trusted ecosystem.

This is the current working vision. Wording may be refined as the product strategy develops.

## 2. The problem Vyasen aims to address

Education information and institutional operations are often fragmented across separate systems, accounts and organizations. An individual's academic journey may span multiple schools, colleges, universities and other institutions, while each institution needs to retain authority over its own operations and official records.

Vyasen aims to connect these needs without collapsing them into one shared data space:

- Institutions need software to manage their people, structures, academic processes and operations.
- Individuals need a durable personal identity and portfolio that is not erased or recreated whenever they change institutions.
- Institutions need control over their own records, policies, permissions and data.
- Individuals need meaningful control over personal information and the ability to share selected information with appropriate parties.
- Organizations need ways to coordinate multiple institutions while preserving delegated authority and institutional autonomy.
- Self-hosting institutions and the wider developer community need an extensible platform that can be adapted without routinely forking the core.

## 3. The product promise

Vyasen brings institutional operations and individual education identity into one connected platform.

It provides:

1. **Institutional operations:** A configurable platform through which schools, colleges, universities and education groups can manage their operations.
2. **Lifelong individual identity:** A personal area where individuals maintain their profile, education portfolio, credentials, documents, skills, experience and achievements.
3. **Verified relationships:** A controlled way to connect an individual to an institution through verified memberships and assigned roles.
4. **Contextual experiences:** A common platform whose available capabilities and experience adapt to the active workspace, the user's roles, permissions and institutional configuration.
5. **Trusted records and sharing:** A distinction between self-declared portfolio information and authoritative records issued by institutions, with controlled sharing and verification.
6. **Extensibility:** Official modules and a governed extension ecosystem for Vyasen contributors, institutions and third parties.
7. **Deployment choice:** A hosted Vyasen offering and a self-hostable codebase intended to provide the same core product capabilities, subject to deployment-specific configuration and services.

## 4. Who Vyasen serves

### Individuals

People who want a persistent personal education identity and portfolio, whether or not they currently belong to an institution. This includes students, teachers, professionals, alumni and other participants in education.

### Educational institutions

Initially focused on:

- Primary, secondary and higher-secondary schools.
- Colleges.
- Universities.

### Education groups

Trusts, chains and parent organizations that coordinate multiple institutions through a separate management workspace and explicitly delegated governance.

### Developers and ecosystem partners

Vyasen contributors, institutions building their own extensions, and third-party developers integrating external services.

## 5. Foundational product model

The product is based on three distinct concepts:

- **Global identity:** A person's Vyasen account and identity, independent of any one institution.
- **Personal area:** The individual's private-by-default space for personal information and portfolio records. It is not an institutional workspace or tenant.
- **Workspace:** An organization's operational context, with its own members, roles, policies, configuration and institution-owned records.

A person may have no workspace membership, one membership or memberships in multiple workspaces. The same person may hold different roles in different workspaces.

**Core invariant:**

> Identity is global. Authorization is contextual. Personal records belong to the individual; official institutional records remain under the authority of the relevant institution.

## 6. Long-term ambition

Vyasen has two complementary ambitions:

- Enable institutions to operate through a unified, extensible platform.
- Enable individuals to carry a trusted education identity and portfolio across institutions throughout life.

The long-term ambition does not mean every capability must exist in the first release. Product architecture and sequencing should support evolution without making the initial release unnecessarily complex.

## 7. What success should mean

Success should be evaluated through evidence such as:

- Institutions can onboard and operate core workflows reliably.
- Individuals can maintain a useful personal area without an institutional membership.
- Memberships connect people to institutions through trustworthy verification and contextual authorization.
- Institutions retain control over their official records and workspace data.
- Users can safely move between authorized workspaces.
- Personal data and documents are shared according to clear, enforceable policies.
- Modules and extensions can be adopted without weakening the security boundary.
- Self-hosting institutions can deploy and maintain the platform with understandable documentation.

Specific metrics and targets are intentionally deferred until the initial product scope and release plan are defined.

## 8. Guiding statement

Vyasen is not merely a collection of school-management screens. It is a connected education platform built around people, institutions, trusted relationships, governed capabilities and portable identity.
