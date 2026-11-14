# Vyasen — Scope and Boundaries

- **Document:** Scope and Boundaries
- **Version:** 0.1
- **Status:** Initial baseline; evolving
- **Last updated:** 2026-11-12

## 1. Purpose

This document defines the current product scope at a capability level and clarifies important ownership, trust and authorization boundaries. It is not a release plan or a complete functional specification.

## 2. Intended audiences and organization types

### Initial target organization types

- Primary, secondary and higher-secondary schools.
- Colleges.
- Universities.
- Education groups, trusts and chains.

Other education-related organizations may be considered later.

### Individual audiences

Students, teachers, parents or guardians, administrators, non-teaching staff, alumni and other people participating in education. Exact role catalogues and eligibility rules will be defined as workflows are designed.

## 3. Product scope areas

| Area                               | Scope direction                                                                  | Detailed design status                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Global identity and authentication | Individual account independent of institutions                                   | Initial auth work exists; review and document implementation separately |
| Personal area and portfolio        | Personal profile, education journey, credentials and documents                   | Concept agreed; detailed data model pending                             |
| Public profile                     | Opt-in, user-selected public information and visitor preview                     | Concept agreed; detailed controls pending                               |
| Workspaces                         | Independent institutional and parent-organization contexts                       | Concept agreed                                                          |
| Memberships                        | Verified relationships connecting people to workspaces                           | Concept agreed; lifecycle details pending                               |
| Roles and permissions              | Contextual roles, permissions and scopes                                         | Direction agreed; authorization model to be designed                    |
| Organization hierarchy             | Parent groups, institutions and internal organizational units                    | Concept agreed; detailed model pending                                  |
| Modules                            | Core, optional, community and third-party capabilities                           | Governance direction agreed; module framework pending                   |
| Extensions                         | Permission-scoped APIs by default; trusted self-hosted extensions under controls | Hybrid direction agreed; technical model pending                        |
| Academic operations                | Classes, courses, schedules, attendance, exams and results                       | Capability area; release scope pending                                  |
| Administrative operations          | Staff, communications, calendars, documents, facilities, library, fees and HR    | Capability area; release scope pending                                  |
| Document sharing and verification  | Issuer policies, owner consent, controlled requests and verification             | Core rules agreed; detailed workflows pending                           |
| Hosted and self-hosted deployment  | Both deployment models intended                                                  | Deployment/edition details pending                                      |

## 4. Important boundaries

### 4.1 Global identity boundary

A global user identity is not owned by one institution. An institution's membership record connects that identity to its workspace.

### 4.2 Personal versus institutional data

Personal profile and portfolio data are distinct from official records maintained by an institution. A personal area does not become an institutional data store merely because the person joins that institution.

### 4.3 Workspace boundary

Each workspace has its own membership, roles, policies, configuration and institution-owned records. Access in one workspace does not imply access in another.

### 4.4 Organizational-unit boundary

Departments, campuses, faculties, classes and similar structures normally exist inside a workspace. They may be used as scopes for access and reporting, but are not automatically independent workspaces or tenants.

### 4.5 Parent organization boundary

A parent organization has a separate management workspace. Its authority over institution workspaces is explicit and delegated. Association does not automatically merge records or grant unrestricted access.

### 4.6 Module boundary

Module availability, activation, configuration and user authorization are separate. A module cannot grant privileges merely by being enabled.

### 4.7 Extension boundary

Extensions use approved, permission-scoped interfaces by default. Trusted custom backend code is a controlled self-hosting capability, not an assumption that all extensions can access internal storage or bypass authorization.

### 4.8 Document boundary

The issuer defines the maximum sharing policy for an issued document. The owner may choose a stricter visibility setting but cannot make a restricted document public against issuer policy.

## 5. Document and information visibility scope

Current visibility concepts:

- **Private:** Available to the individual, subject to platform operations and legal obligations.
- **Shared:** Available to specifically authorized recipients for a defined purpose.
- **Public:** Available to visitors of an enabled public profile, only where the information's own policy permits it.

For issued documents:

- Public classification plus owner opt-in can permit public display.
- Restricted classification prohibits public display but may permit controlled institutional verification.
- Secret classification prohibits public display. Any exceptional workflow requires explicit issuer authorization and separate design.

The exact meaning of issuer classifications, eligible institutions, permitted actions and retention rules remains to be specified.

## 6. Out of scope for this baseline

This document does not yet define:

- Complete functional requirements for every module.
- Final role catalogue or permission matrix.
- Complete organization hierarchy schema.
- Full policy inheritance and override semantics.
- Exact document states, correction, replacement, revocation or retention lifecycle.
- Full extension manifest, runtime, sandbox or review process.
- API contracts or event schemas.
- Final database schema for future academic and administrative modules.
- Detailed service-level objectives, pricing or commercial editions.
- A committed beta feature list or release dates.

These topics should be designed when they become necessary for product planning or implementation.

## 7. Scope-change rule

A new feature should be evaluated for:

- User problem and intended audience.
- Workspace and data ownership.
- Permission and scope requirements.
- Privacy and document implications.
- Module or extension placement.
- Operational and support cost.
- Release priority and dependencies.

A feature should not be added to the initial release solely because it is part of the long-term platform vision.
