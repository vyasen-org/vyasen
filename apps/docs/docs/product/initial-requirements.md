# Vyasen — Initial Product Requirements

- **Document:** Initial Product Requirements
- **Version:** 0.1
- **Status:** Initial baseline; evolving
- **Last updated:** 2026-11-12

## 1. Purpose and interpretation

This document captures high-level product requirements established during initial product discovery. It is not yet a complete implementation-ready specification.

Requirement labels:

- **Agreed:** Direction explicitly selected during product discussion.
- **Initial:** A reasonable baseline inferred from agreed principles; validate before implementation.
- **Deferred:** Requires a later workflow, policy or technical design.

Priority is not assigned here. Release priority will be defined after product scope and delivery constraints are reviewed.

## 2. Identity and personal area

| ID     | Requirement                                                                                                                                                 | Status           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| ID-001 | A person shall be able to create and use a Vyasen account without joining an institution.                                                                   | Agreed           |
| ID-002 | Each user shall have one global identity independent of institutional workspaces.                                                                           | Agreed           |
| ID-003 | Each user shall have a personal area separate from institutional workspaces.                                                                                | Agreed           |
| ID-004 | The personal area shall support a personal profile and portfolio, including education history, skills, experience, credentials, documents and achievements. | Agreed direction |
| ID-005 | Personal portfolio entries shall be distinguishable from institution-issued verified records.                                                               | Agreed           |
| ID-006 | Users shall not be able to alter the authoritative contents of institution-issued records.                                                                  | Agreed principle |
| ID-007 | A user's personal area shall remain available independently of their institutional memberships.                                                             | Agreed           |

## 3. Public profiles and privacy

| ID     | Requirement                                                                                                                     | Status           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| PR-001 | Public profiles shall be opt-in and disabled until the user enables them.                                                       | Agreed           |
| PR-002 | Users shall choose which permitted profile information is publicly visible.                                                     | Agreed           |
| PR-003 | Users shall be able to preview their public profile as an external visitor would see it.                                        | Agreed           |
| PR-004 | The system shall distinguish private, specifically shared and public information.                                               | Agreed direction |
| PR-005 | Making a profile public shall not make private documents or institutional records public by default.                            | Agreed           |
| PR-006 | Field- and record-level visibility controls shall be supported where applicable.                                                | Agreed direction |
| PR-007 | Public profile search-engine discoverability and directory behavior shall be configurable or explicitly decided before release. | Deferred         |

## 4. Workspaces and memberships

| ID     | Requirement                                                                                                                                                                                  | Status           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| WS-001 | An institution shall operate within its own workspace.                                                                                                                                       | Agreed           |
| WS-002 | A person may have zero, one or multiple workspace memberships.                                                                                                                               | Agreed           |
| WS-003 | A person may hold different roles in different workspaces.                                                                                                                                   | Agreed           |
| WS-004 | Membership shall represent a verified relationship, not merely a user's claim during signup.                                                                                                 | Agreed           |
| WS-005 | Users shall be able to switch between workspaces for which they are authorized.                                                                                                              | Agreed direction |
| WS-006 | Workspace switching shall not itself grant or elevate permissions.                                                                                                                           | Agreed principle |
| WS-007 | A university shall normally be one workspace; departments, faculties and campuses shall be modeled as internal organizational units or scopes unless a later decision establishes otherwise. | Agreed           |
| WS-008 | Workspace-owned records shall remain within the relevant workspace boundary.                                                                                                                 | Agreed principle |
| WS-009 | The detailed membership request, approval, suspension and termination lifecycle shall be specified before implementing those workflows.                                                      | Deferred         |

## 5. Parent organizations and governance

| ID      | Requirement                                                                                                                       | Status   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| GOV-001 | A parent organization may have its own management workspace separate from institution workspaces.                                 | Agreed   |
| GOV-002 | Independent institutions shall be able to operate without a parent organization.                                                  | Agreed   |
| GOV-003 | A parent organization may onboard first and create or invite institutions.                                                        | Agreed   |
| GOV-004 | An institution may onboard independently and later request association with a parent organization.                                | Agreed   |
| GOV-005 | Association shall require appropriate verification and approval; it shall not silently merge workspaces or institutional records. | Agreed   |
| GOV-006 | Parent organizations may define mandatory policies and permitted boundaries.                                                      | Agreed   |
| GOV-007 | Institutions shall retain operational configuration control within group-defined boundaries.                                      | Agreed   |
| GOV-008 | Specific governance decisions may be delegated to either the group or institution.                                                | Agreed   |
| GOV-009 | Group-level roles shall not automatically confer unrestricted institution-level privileges.                                       | Agreed   |
| GOV-010 | Exact policy inheritance, override, delegation and conflict-resolution rules shall be specified later.                            | Deferred |

## 6. Roles, permissions and contextual experience

| ID        | Requirement                                                                                                                                                            | Status               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| AUTHZ-001 | Authorization shall be evaluated in the context of the active workspace and applicable resource scope.                                                                 | Agreed principle     |
| AUTHZ-002 | The platform shall support role- and permission-aware experiences in one coherent application.                                                                         | Agreed               |
| AUTHZ-003 | User access shall be constrained by assigned roles, permissions, scopes, policies and enabled capabilities.                                                            | Agreed direction     |
| AUTHZ-004 | Client-supplied user, workspace, role or resource identifiers shall not be treated as proof of authorization.                                                          | Security requirement |
| AUTHZ-005 | Module activation shall not automatically grant user permissions.                                                                                                      | Agreed               |
| AUTHZ-006 | A detailed role catalogue, permission vocabulary and resource-scope model shall be designed before authorization implementation expands beyond the initial foundation. | Deferred             |

## 7. Modules and extensions

| ID      | Requirement                                                                                                                                              | Status           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| MOD-001 | Vyasen shall distinguish official core modules, official optional modules, community/institutional modules and third-party extensions.                   | Agreed direction |
| MOD-002 | Parent organizations may define which modules are available, required or restricted for their institutions.                                              | Agreed           |
| MOD-003 | Institutions may enable and configure modules permitted by applicable group policy.                                                                      | Agreed           |
| MOD-004 | Independent institutions shall manage their own module configuration.                                                                                    | Agreed           |
| MOD-005 | Module availability, activation, configuration and authorization shall be treated as separate concerns.                                                  | Agreed           |
| EXT-001 | Extensions shall use documented, permission-scoped APIs by default.                                                                                      | Agreed           |
| EXT-002 | Self-hosted deployments may support trusted custom integrations or backend extensions.                                                                   | Agreed           |
| EXT-003 | Trusted custom extensions shall require explicit administrative configuration and security controls.                                                     | Agreed           |
| EXT-004 | Installing or enabling an extension shall not implicitly grant unrestricted data access or authorization privileges.                                     | Agreed           |
| EXT-005 | Extension packaging, API versioning, compatibility, isolation, review and lifecycle shall be specified before the extension ecosystem is opened broadly. | Deferred         |

## 8. Institutional records and documents

| ID      | Requirement                                                                                                                                      | Status           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| DOC-001 | Institutions shall be authoritative for official records they issue or maintain.                                                                 | Agreed           |
| DOC-002 | Issued documents shall have an issuer-defined sharing classification.                                                                            | Agreed           |
| DOC-003 | Public display of an issued document shall require both issuer permission and owner permission.                                                  | Agreed           |
| DOC-004 | Owner preference shall not override issuer restrictions.                                                                                         | Agreed           |
| DOC-005 | Restricted documents shall not appear on public profiles but may be eligible for controlled institutional verification if the issuer permits it. | Agreed           |
| DOC-006 | Secret documents shall never be publicly displayed.                                                                                              | Agreed           |
| DOC-007 | A controlled document-access request workflow shall support purpose-bound requests and applicable owner/issuer authorization.                    | Agreed direction |
| DOC-008 | Direct document sharing shall be possible when issuer policy and owner consent both permit it.                                                   | Agreed           |
| DOC-009 | For sensitive documents, verification without exposing the original may be used when the issuer permits that method.                             | Agreed           |
| DOC-010 | Verification shall rely on authoritative issuer records rather than trusting an uploaded copy alone.                                             | Agreed principle |
| DOC-011 | Detailed document correction, replacement, revocation, retention and lifecycle behavior shall be designed later.                                 | Deferred         |

## 9. Deployment and platform operation

| ID      | Requirement                                                                                                                                 | Status           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| DEP-001 | Vyasen shall have a hosted product direction.                                                                                               | Agreed           |
| DEP-002 | Vyasen shall support a self-hostable deployment direction.                                                                                  | Agreed           |
| DEP-003 | The core product model should remain coherent across hosted and self-hosted deployments.                                                    | Agreed direction |
| DEP-004 | Differences in operations, managed services, support, integrations and editions shall be documented before commercial deployment decisions. | Deferred         |

## 10. Initial non-functional requirements

These are foundational requirements to be converted into measurable acceptance criteria during technical design.

- **Security:** Enforce authentication and authorization server-side; use least privilege; protect credentials, sessions and sensitive data.
- **Tenant isolation:** Prevent cross-workspace data access through every API, background job, export and integration path.
- **Privacy:** Minimize collection and disclosure; enforce visibility and sharing policy at the point of access.
- **Auditability:** Record sensitive membership, permission, governance and document-sharing actions.
- **Reliability:** Define backup, recovery, migration and operational procedures before production use.
- **Performance:** Establish measurable targets after initial usage patterns and deployment topology are known.
- **Maintainability:** Keep module boundaries, contracts and migrations understandable and version-controlled.
- **Extensibility:** Prefer stable public contracts over dependence on internal implementation details.
- **Accessibility and usability:** Role-aware interfaces should remain understandable and usable across supported devices and user needs.

## 11. Open decisions and deferred specifications

The following are deliberately not finalized in this document:

1. Exact beta / MVP feature set and release sequence.
2. Detailed onboarding and membership verification workflows.
3. Complete role and permission catalogue.
4. Policy inheritance and delegation semantics.
5. Full public-profile field catalogue and discovery controls.
6. Document classifications, permitted actions and exceptional workflows.
7. Document correction, replacement, revocation and retention lifecycle.
8. Extension manifest, runtime, trust model and sandboxing.
9. API contracts, event model and integration lifecycle.
10. Detailed non-functional targets and operational SLOs.

## 12. Change management

Requirements should be changed through explicit decisions. Each material change should record:

- Requirement ID.
- Decision or change.
- Reason and trade-offs.
- Affected product areas.
- Security, privacy and data-ownership implications.
- Date and status.

Do not silently convert a proposal or assumption into an agreed requirement.
