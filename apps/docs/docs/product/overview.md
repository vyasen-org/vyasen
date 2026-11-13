# Vyasen — Product Overview

- **Document:** Product Overview
- **Version:** 0.1
- **Status:** Initial baseline; evolving
- **Last updated:** 2026-11-12

## 1. What is Vyasen?

Vyasen is a unified education platform for educational institutions and individuals. Institutions use workspaces to manage their operations. Individuals use a personal area to maintain their identity and lifelong education portfolio. Verified memberships connect individuals to institutional workspaces.

Vyasen is intended to be available as a hosted product and as an open-source, self-hostable platform.

## 2. Product surfaces and contexts

### 2.1 Individual personal area

Every user has a personal area independent of institutional membership.

It may contain:

- Personal profile and selected personal information.
- Education history and learning journey.
- Skills, experience, achievements and certificates.
- Personal documents and portfolio materials.
- Controls for public-profile visibility and selective sharing.
- Access to document records issued by institutions, subject to applicable permissions.

The personal area is private by default. It is not a tenant or workspace.

### 2.2 Institutional workspace

A workspace represents an organization that operates through Vyasen. It has its own:

- Workspace identity and configuration.
- Members and verified memberships.
- Roles, permissions and scoped access.
- Organizational and academic structures.
- Enabled modules and operational settings.
- Institution-owned records, policies and audit history.

A university is one workspace by default. Faculties, departments, campuses, programs, classes and similar units are organizational structures and resource scopes, not automatically separate workspaces.

### 2.3 Parent-organization workspace

An education group, trust or chain may have its own management workspace, separate from the workspaces of its member institutions.

The group workspace supports group-level governance and coordination. Group authority over an institution must be explicitly delegated; a group role does not automatically grant unrestricted access to every institution.

Independent institutions can operate without a parent organization.

## 3. Organization onboarding models

Vyasen supports both directions:

### Group-first

1. A parent organization onboards and is verified.
2. It creates or invites institutions.
3. Each institution completes its own onboarding and verification.
4. The relationship between the group and institution is established with defined governance.

### Institution-first

1. An institution onboards and is verified independently.
2. It operates its own workspace.
3. A parent organization may later request an association.
4. Both sides approve the association under a controlled process.

Association must not silently merge workspace identities, users or institutional records. The relationship has its own lifecycle, permissions and audit history.

## 4. People, memberships and roles

A global user identity can be connected to multiple workspaces.

Examples:

- A person is a student at one university and a teacher at a school.
- A person is a principal in one institution and a central administrator in a trust.
- A person has a personal area but no institutional membership.

Roles are contextual to a workspace. A user's role in one workspace does not automatically transfer to another. Multiple roles within one workspace may be supported where assigned.

The platform should support role- and permission-aware experiences without creating separate applications for each user type.

## 5. Workspace and governance model

Vyasen supports flexible organization hierarchies and delegated governance.

- A parent organization can define mandatory policies and permitted boundaries.
- An institution retains operational configuration control within those boundaries.
- Specific decisions may be delegated to either level.
- Independent institutions manage their own governance.
- Group-level authority must be explicit, scoped and auditable.

Policy inheritance and override semantics require a later detailed policy design.

## 6. Modules and extensions

Vyasen's capabilities are organized as modules and extensions.

### Module governance

A parent organization may define which modules are available, required or restricted for its institutions. Each institution can enable and configure permitted modules. Independent institutions manage their own module choices.

Availability, activation, configuration and user authorization are separate concerns. Enabling a module does not automatically grant every user access to it.

### Ecosystem categories

- Official core modules maintained by Vyasen.
- Official optional modules maintained by Vyasen.
- Community or institution-developed modules.
- Third-party integrations and extensions.

### Extension model

The agreed direction is hybrid:

- Extensions use documented, versioned, permission-scoped APIs by default.
- Self-hosted deployments may support trusted custom integrations or backend extensions.
- Such extensions require explicit administrative configuration and security controls.
- Installing an extension must not implicitly grant it unrestricted access to data or privileges.

The detailed extension runtime, packaging, review and isolation model remains to be designed.

## 7. Individual portfolio, public profile and sharing

Individuals can maintain their own portfolio. Portfolio entries may be self-declared or backed by institution-issued records. These must be clearly distinguishable.

Public profiles are opt-in. A person chooses which permitted information to publish and can preview the public-facing profile as a visitor would see it.

Visibility includes:

- Private information visible only to the individual, subject to platform operation and legal obligations.
- Information shared with specifically authorized parties.
- Public information visible to anyone who can access the public profile.

For institution-issued documents, public visibility requires both issuer permission and owner permission. An owner cannot override issuer restrictions. Secret documents must never be publicly displayed.

## 8. Document sharing and verification

The current product direction distinguishes:

- **Public documents:** The issuer permits public sharing; the owner must also opt in before public display.
- **Restricted documents:** Not publicly displayed; may be shared with eligible institutions for permitted verification workflows, subject to required authorization.
- **Secret documents:** Never public. Any exceptional verification or disclosure workflow must be explicitly permitted by the issuer; otherwise access is prohibited.

A controlled access-request workflow is planned for restricted documents. Requests should be purpose-bound, scoped, authorized, auditable and potentially time-limited.

Vyasen should support two verification approaches:

1. Direct document sharing when both issuer policy and owner consent allow it.
2. Verification without exposing the original document for sensitive documents when the issuer permits that method.

Detailed lifecycle, correction, revocation, retention and verification protocols are deferred for later design.

## 9. Initial capability areas

The platform's conceptual capability areas include:

- Identity, authentication and personal profile.
- Workspace and membership management.
- Roles, permissions and authorization.
- Organization and academic structure.
- Student and staff administration.
- Courses, classes, sections and learning activities.
- Schedules, attendance, examinations and results.
- Communication and calendars.
- Documents and credentials.
- Facilities and library.
- Fees, finance, HR and recruitment.
- Reporting and analytics.
- Workspace governance, policies, audit and integrations.

This is a capability landscape, not a commitment that all areas ship in the initial release.

## 10. Deployment model

The intended product model includes:

- Hosted Vyasen, operated as a service.
- Self-hosted Vyasen deployments operated by institutions or organizations.

The aim is functional consistency in core product capabilities. Deployment-specific differences may exist in infrastructure, integrations, operational responsibilities, support and optional services. These differences need a later deployment and edition policy.

## 11. Product terminology

| Term                | Meaning                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| User / person       | A global Vyasen identity                                                     |
| Personal area       | An individual's independent personal and portfolio space                     |
| Workspace           | An organization's operational context                                        |
| Membership          | A verified relationship between a person and a workspace                     |
| Role                | A named responsibility assigned within a workspace                           |
| Permission          | An allowed action or capability                                              |
| Scope               | The resources or organizational boundaries within which a permission applies |
| Organizational unit | A department, campus, faculty, class or similar structure within a workspace |
| Parent organization | A group, trust or chain coordinating institutions                            |
| Module              | A packaged area of platform functionality                                    |
| Extension           | An integration or additional capability extending the platform               |
| Issuer              | The institution or authority that issued an official document                |
| Owner               | The individual to whom a personal or issued document relates                 |
