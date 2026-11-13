# Vyasen — Goals and Product Principles

- **Document:** Goals and Principles
- **Version:** 0.1
- **Status:** Initial baseline; evolving
- **Last updated:** 2026-11-12

## 1. Product goals

### G1. Enable institutions to operate through Vyasen

Provide a configurable platform for schools, colleges, universities and education groups.

### G2. Give individuals a lifelong education identity

Allow people to use Vyasen without an institutional membership and maintain a personal profile and portfolio across life stages.

### G3. Connect people and institutions through verified relationships

Support institution-approved memberships and contextual roles rather than treating signup as proof of institutional affiliation.

### G4. Preserve institutional autonomy and group governance

Support independent institutions and parent organizations with explicit delegation, policy boundaries and auditable authority.

### G5. Protect personal and institutional information

Make privacy, tenant isolation, least privilege, document governance and auditable access foundational requirements.

### G6. Support a modular and extensible ecosystem

Allow official, community, institution-developed and third-party capabilities without granting extensions implicit access to core data or authorization.

### G7. Support hosted and self-hosted adoption

Make the core platform usable as a hosted service and deployable by institutions themselves.

### G8. Evolve without premature complexity

Design foundational boundaries carefully while deferring detailed decisions until the relevant module or workflow is being developed.

## 2. Product principles

### P1. Identity is global; authorization is contextual

A person has one global identity. Their access is determined by the active workspace, verified membership, assigned roles, permissions, scopes and applicable policies.

### P2. Personal area is not a workspace

The personal area belongs to the individual. It is not an institution, tenant or organizational workspace.

### P3. Institutions own their operational records

Official institutional records remain under the authority of the institution that creates or maintains them. Personal portfolio copies or references do not silently modify institutional records.

### P4. Individuals control their personal portfolio

Individuals can manage personal and self-declared information. They cannot alter the authoritative contents of institution-issued records.

### P5. Verification must be explicit

A user account does not prove that someone is a student, teacher, employee or administrator. Institutional relationships require an appropriate verification and approval process.

### P6. Workspace boundaries are security boundaries

Workspace context must be established and validated server-side. Client-supplied workspace IDs, roles or resource identifiers must never be trusted as proof of access.

### P7. Least privilege by default

Grant only the permissions and resource scope required for a task. A role name alone should not become an unrestricted authorization shortcut.

### P8. Group authority is delegated, not assumed

A parent organization may set mandatory boundaries and receive delegated capabilities. It does not automatically inherit unrestricted control over every institution.

### P9. Configuration and authorization are different

A module being available or enabled does not mean every user can access it. Module availability, activation, configuration and user authorization must be evaluated separately.

### P10. Privacy is private by default

Public profiles are opt-in. Individuals select public information. Private sharing is specific and purpose-bound.

### P11. Issuer policy constrains document sharing

For institution-issued documents, owner consent cannot override issuer restrictions. Public display requires both owner and issuer permission. Secret documents are never public.

### P12. Share the minimum necessary

Where permitted, direct sharing is acceptable. For sensitive documents where the issuer permits verification without disclosure, prefer the least-disclosing verification method.

### P13. Extensions must not bypass platform security

Permission-scoped APIs are the default. Trusted custom backend extensions may be supported in self-hosted deployments only with explicit administrative controls and security safeguards.

### P14. One coherent platform, contextual experiences

Avoid separate applications for each role. Present relevant capabilities according to workspace, role, permissions, scopes, enabled modules and user preferences.

### P15. Secure and auditable operations

Sensitive administrative, membership, permission, document and governance actions should be traceable. Detailed audit event requirements will be specified per workflow.

### P16. Design for evolution, deliver incrementally

Avoid choices that unnecessarily block foreseeable capabilities, but do not implement every long-term capability in the first release.

## 3. Non-goals and guardrails

The following are not assumed goals for the initial release:

- Implementing every module listed in the product landscape.
- Building a public social network or unrestricted people-search service.
- Making every personal profile public.
- Treating every individual account as a tenant/workspace.
- Giving parent organizations automatic unrestricted access to institution workspaces.
- Giving third-party extensions direct unrestricted access to the core database.
- Designing every document lifecycle, policy exception or advanced workflow before the relevant feature is scheduled.

These guardrails can be revisited through explicit product decisions.

## 4. Decision-making principles

When evaluating a product or technical decision, ask:

1. Does it preserve the global identity / contextual authorization model?
2. Does it preserve personal versus institutional data ownership?
3. Does it enforce tenant and resource boundaries server-side?
4. Does it respect issuer, owner and institution authority?
5. Does it support both independent institutions and governed groups?
6. Does it avoid unnecessary coupling between modules?
7. Can it be delivered incrementally without undermining the long-term model?
8. Can an operator understand, configure, audit and support it?

## 5. Trade-off rule

When convenience conflicts with security, privacy or institutional authority, Vyasen should preserve the security and authority boundary and improve the workflow around it rather than silently weakening the boundary.
