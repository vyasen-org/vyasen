# Contributing to Indic SMS (School SMS)

Thank you for your interest in contributing to **Indic SMS**! We are building a modern, secure, and accessible multi-tenant School Management System (SMS) designed to serve educational institutions with high reliability and performance.

Open source thrives on community contributions. Whether you are fixing a typo, resolving an open issue, proposing a new feature, or improving documentation, your support is warmly welcomed.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Improving Documentation](#improving-documentation)
  - [Submitting Code](#submitting-code)
- [Monorepo Architecture](#monorepo-architecture)
- [Development Environment Setup](#development-environment-setup)
  - [Prerequisites](#prerequisites)
  - [Initial Setup](#initial-setup)
  - [Configuring Environment Variables](#configuring-environment-variables)
  - [Database Setup & Migrations](#database-setup--migrations)
  - [Running the Workspace](#running-the-workspace)
- [Development Workflow & Standards](#development-workflow--standards)
  - [Architectural & Non-Negotiable Rules](#architectural--non-negotiable-rules)
  - [Coding & Type Safety Standards](#coding--type-safety-standards)
  - [Branching Strategy](#branching-strategy)
  - [Commit Message Conventions](#commit-message-conventions)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Security Disclosures](#security-disclosures)
- [Getting Help](#getting-help)

---

## Code of Conduct

This project is governed by the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code to foster an open, welcoming, diverse, and harassment-free environment for everyone.

---

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing [Issues](https://github.com/vijay-jadhav1997/indic-sms/issues) to ensure the problem has not already been reported or solved.

If filing a new bug:
1. Use the **Bug Report** template if available.
2. Provide a clear, descriptive title.
3. List explicit steps to reproduce the issue, expected outcome, and actual behavior.
4. Include system details: Operating System, Node.js version, browser type & version, and relevant terminal or browser console logs.
5. If applicable, attach a minimal reproducible example.

> **Note:** For security vulnerabilities (e.g., tenant data leaks, auth bypass, injection risks), **do NOT create a public issue**. Follow our [Security Policy](./SECURITY.md) instead.

### Suggesting Enhancements

Feature requests and architectural ideas are welcome:
1. Check existing issues or discussions to avoid duplicate proposals.
2. Outline the motivation: what problem does this feature solve?
3. Describe the proposed solution, alternative designs considered, and any potential impacts on existing school tenants or permissions.

### Improving Documentation

High-quality documentation is critical for educational software. You can contribute by:
- Fixing typographical errors, unclear explanations, or broken links.
- Adding setup guides or edge-case troubleshooting instructions.
- Documenting contract schemas, API endpoints, or database workflows.

---

## Monorepo Architecture

Indic SMS is structured as a **pnpm workspace** managed with **Turborepo**:

```text
indic_sms/
├── apps/
│   ├── api/              # Fastify 5 HTTP REST API, authentication, email & Google OAuth
│   └── web/              # React 19 SPA, Vite, TanStack Router & Query, Tailwind CSS v4
├── packages/
│   ├── config/           # Shared tooling & workspace configurations
│   ├── contracts/        # Shared Zod validation schemas, DTOs, and TypeScript types
│   └── database/         # PostgreSQL 18 schema, Kysely query client, versioned migrations
├── pnpm-workspace.yaml   # Workspace package definitions
├── turbo.json            # Turbo pipeline task caching & execution graph
└── package.json          # Root scripts and workspace devDependencies
```

### Key Architectural Boundaries

- **`packages/contracts` is the Single Source of Truth**: All payloads, API contracts, and parameter validations must use shared Zod schemas.
- **Tenant Isolation**: Indic SMS is multi-tenant. Server-side code must enforce tenant (`school_id`) boundaries for all queries. Frontend role previews are cosmetic; they are never an authorization boundary.
- **Strict Boundary Separation**:
  - Never import frontend packages/modules into `apps/api` or `packages/database`.
  - Never import backend implementation details or server-only secrets into `apps/web`.

---

## Development Environment Setup

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v24.0.0` or newer (LTS recommended)
- **pnpm**: `v12.0.0` or newer (Enable via Corepack: `corepack enable && corepack use pnpm@12`)
- **PostgreSQL**: `v16` or newer (`v18` recommended)
- **Git**

### Initial Setup

1. **Fork the repository** on GitHub: [indic-sms](https://github.com/vijay-jadhav1997/indic-sms).
2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/indic-sms.git
   cd indic-sms
   ```
3. **Install workspace dependencies**:
   ```bash
   pnpm install
   ```

### Configuring Environment Variables

Create your local `.env` file from the provided template:

```bash
cp .env.example .env
```

Open `.env` and configure:
- `DATABASE_URL`: Your local PostgreSQL connection string.
- Authentication secrets: Generate three distinct, cryptographically strong random strings for session, access, and refresh token signing.
- Optional: SMTP configuration (for email OTPs) and Google OAuth Client credentials (for Google Sign-In / One Tap).

### Database Setup & Migrations

Ensure your local PostgreSQL instance is running, then run the database migrations:

```bash
pnpm --filter @school-sms/database migrate
```

### Running the Workspace

Start all applications in development mode:

```bash
pnpm dev
```

By default:
- **Web Client**: `http://localhost:3000`
- **Fastify API**: `http://localhost:4000` (or the port defined in your `.env`)

To validate code across the entire monorepo without starting the servers:

```bash
pnpm typecheck   # Typecheck all packages with TypeScript
pnpm lint        # Run linter across packages
pnpm build       # Validate that all packages build cleanly
```

---

## Development Workflow & Standards

### Architectural & Non-Negotiable Rules

1. **Security First**: Correctness and security always supersede convenience. Never trust client-supplied input, tenant identifiers, or role claims.
2. **Runtime Validation**: All inputs across API boundaries, forms, and environment variables must be validated with Zod.
3. **Information Disclosure Prevention**: Never expose internal errors, database exceptions, stack traces, or tenant secrets in client responses.
4. **Focused PRs**: Keep changes modular and focused. Avoid mixing formatting or unrelated refactorings into feature or bugfix branches.

### Coding & Type Safety Standards

- **TypeScript Strict Mode**: Avoid using `any`. Write explicit interfaces, DTOs, and contract types using Zod schemas inferred with `z.infer<typeof Schema>`.
- **Formatting**: Consistent formatting via Prettier. Check your code using `.editorconfig` rules.
- **Component Design**: UI components should follow the Radix UI / shadcn design language using Tailwind CSS utility classes and `clsx`/`tailwind-merge`.

### Branching Strategy

- The primary development branch is **`develop`**. (Production releases are tagged on `main`).
- Create a new branch off `develop` for your work:
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b <type>/<short-description>
  ```
- Recommended branch naming prefixes:
  - `feat/` for new features (e.g., `feat/student-attendance-table`)
  - `fix/` for bug fixes (e.g., `fix/oauth-redirect-uri`)
  - `docs/` for documentation updates (e.g., `docs/kysely-migrations`)
  - `refactor/` for code refactorings without behavior change
  - `chore/` for dependency updates or tooling changes

### Commit Message Conventions

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

#### Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Code change that improves performance
- `test`: Adding or updating test cases
- `chore`: Tooling, build pipeline, or dependency maintenance

#### Examples:
```text
feat(api): add multi-tenant school onboarding endpoint
fix(web): resolve sidebar collision on mobile viewports
docs(readme): update local postgres connection instructions
```

---

## Submitting a Pull Request

1. **Synchronize with upstream**:
   ```bash
   git fetch origin
   git rebase origin/develop
   ```
2. **Run verification checks locally**:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```
   If working on backend auth/logic with tests:
   ```bash
   pnpm --filter @school-sms/api test
   ```
3. **Push to your fork**:
   ```bash
   git push origin <your-branch-name>
   ```
4. **Open a Pull Request**:
   - Set the base branch to `develop`.
   - Provide a clear PR title matching Conventional Commits.
   - Fill out the PR description summarizing what changed and why.
   - Reference any related issues (e.g., `Closes #42`).
   - Ensure all automated checks (CI, CodeRabbit review, builds) pass.
5. **Participate in Code Review**:
   - Address reviewer feedback promptly.
   - Once approved, maintainers will squash and merge your contribution.

---

## Security Disclosures

Please do **NOT** report security issues in public GitHub issues or discussions.

Refer to our [Security Policy](./SECURITY.md) for instructions on how to privately disclose vulnerabilities to our team.

---

## Getting Help

- **GitHub Discussions**: For general questions, roadmap ideas, and architecture inquiries.
- **GitHub Issues**: For verified bug reports and concrete feature proposals.

Thank you for contributing to **Indic SMS**! Your contributions make education management safer, faster, and more accessible for schools everywhere.

