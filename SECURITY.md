# Security Policy

At **Indic SMS**, we take the security and privacy of educational institutions, staff, parents, and students very seriously. As a multi-tenant School Management System, protecting Personally Identifiable Information (PII), academic records, and institutional data from unauthorized access is fundamental to our design.

This policy outlines how to report potential vulnerabilities and what you can expect from our security response team.

---

## Supported Versions

We actively maintain and provide security patches for the following branches and releases:

| Version / Branch | Supported          | Status                                 |
| ---------------- | ------------------ | -------------------------------------- |
| `main`           | :white_check_mark: | Active production release branch       |
| `develop`        | :white_check_mark: | Active development branch              |
| `< 1.0.0`        | :x:                | Pre-release commits prior to latest tag |

We strongly recommend always running the latest tagged version or pulling the most recent commit on the default branch.

---

## Reporting a Vulnerability

> [!CAUTION]
> **Do NOT file public GitHub Issues, discussions, or pull requests for suspected security vulnerabilities.** Public disclosure exposes sensitive institutions and student data before a fix can be prepared.

### Preferred Channel: GitHub Private Security Advisories

The safest and fastest way to report a vulnerability is via GitHub's Private Vulnerability Reporting:

1. Navigate to our repository: [https://github.com/vijay-jadhav1997/indic-sms](https://github.com/vijay-jadhav1997/indic-sms).
2. Click the **Security** tab.
3. Click **Report a vulnerability** (or go directly to [Security Advisories New](https://github.com/vijay-jadhav1997/indic-sms/security/advisories/new)).
4. Complete the advisory form with as much detail as possible.

### Alternative Channel: Direct Email

If GitHub Private Advisories are unavailable or you prefer direct communication, please email:

- **Security Team**: `security@indic-sms.org` *(or contact the repository maintainer directly via GitHub profile)*
- Use the subject line: `[SECURITY] Indic SMS Vulnerability Report - <Brief Summary>`
- If sharing sensitive proofs of concept or exploits, request an encryption key or encrypt with our designated PGP key before sending.

---

## What to Include in Your Report

To help us triage and patch the issue quickly, please provide:

1. **Vulnerability Type**: (e.g., Cross-Tenant IDOR/BOLA, Authentication Bypass, Privilege Escalation, SQL Injection, Remote Code Execution, Sensitive Data Exposure).
2. **Affected Component**:
   - `apps/api` (Fastify API backend)
   - `apps/web` (React/Vite frontend)
   - `packages/contracts` (Zod schemas / DTOs)
   - `packages/database` (Kysely queries, migrations, RLS policies)
3. **Step-by-Step Reproduction**: Detailed, reproducible steps explaining how to trigger the issue.
4. **Proof of Concept (PoC)**: Minimal scripts, HTTP payloads, or screenshots demonstrating the exploit.
5. **Impact Assessment**: What data or tenant boundaries can be compromised, and what privilege level is required to exploit it?
6. **Suggested Remediation**: (Optional) If you have identified a potential code fix or architectural mitigation.

---

## Response Timeline & SLA

We are committed to coordinated, transparent vulnerability management:

- **Initial Acknowledgment**: Within **48 hours** of receiving your report.
- **Triage & Validation**: Within **3 to 5 business days**, confirming whether the issue is reproducible and determining severity (CVSS score).
- **Remediation & Patching**:
  - **Critical (CVSS 9.0–10.0)**: Fix targeted within **7 days**.
  - **High (CVSS 7.0–8.9)**: Fix targeted within **14 days**.
  - **Medium / Low (CVSS < 7.0)**: Addressed in the subsequent scheduled release.
- **Coordinated Disclosure**: We will collaborate with the reporter to agree on a public disclosure date once the patch has been tested, merged, and released.

---

## Scope: What Qualifies as a Security Vulnerability?

### In-Scope Vulnerabilities

We prioritize reports involving:
- **Tenant Isolation Breaches**: Accessing or altering data belonging to another school or tenant without authorization (IDOR / BOLA).
- **Privilege Escalation**: Elevating permissions from student/parent to teacher/admin, or circumventing role-based access control (RBAC).
- **Authentication & Session Flaws**: Bypass of session cookies, email OTP verification, or Google OAuth / One Tap flows.
- **Injection Attacks**: SQL injection (via Kysely queries or raw migrations), command injection, or path traversal.
- **Remote Code Execution (RCE)** or Server-Side Request Forgery (SSRF).
- **Sensitive Data Exposure**: Leaking database credentials, auth secrets, student PII, or internal stack traces in production API responses.

### Out-of-Scope (Non-Qualifying) Issues

The following scenarios are considered out of scope unless they directly facilitate an in-scope compromise:
- Denial of Service (DoS / DDoS) attacks or automated load-testing against demo/staging instances.
- Social engineering, phishing, or physical attacks against project maintainers or contributors.
- Missing HTTP security headers without a demonstrated, reproducible exploit.
- Frontend role preview navigation (as documented in `README.md`, frontend role previews are cosmetic and do not represent an authorization boundary; server-side validation is authoritative).
- Software version disclosure or banner grabbing without an exploitable vulnerability.
- Vulnerabilities that require root/physical access to an already-compromised client machine.

---

## Safe Harbor & Research Guidelines

We consider security research conducted in good faith to be an invaluable service to our community. If you conduct vulnerability research in compliance with this policy:

- We will **not** pursue legal action or initiate law enforcement investigations against you.
- We will work closely with you to understand and resolve the issue in a timely manner.
- We will publicly credit your contribution in our release notes and GitHub Security Advisory (unless you request anonymity).

To stay protected under Safe Harbor, you must:
- Make a good faith effort to avoid privacy violations, data destruction, and disruption of live educational services.
- Never view, modify, or delete data belonging to actual schools, students, or users; test strictly against accounts and demo tenants you own.
- Give our team a reasonable window of time to patch the vulnerability before disclosing any details publicly.

Thank you for helping us keep **Indic SMS** safe, trustworthy, and secure for educators, parents, and students!

