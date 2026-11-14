---
title: Contributing to Vyasen
description: Find the repository contribution workflow, local setup, and safe ways to help.
---

# Contributing to Vyasen

Thank you for considering a contribution. Vyasen is early in development, so
focused feedback, clear issue reports, documentation improvements, and small
reviewable changes are all valuable.

## Before starting

1. Review the [product vision](../product/vision.md), [scope](../product/scope-and-boundaries.md),
   and [current status](../project/development-status.md).
2. Search existing [issues](https://github.com/vyasen-org/vyasen/issues) before
   opening a new one.
3. For a substantial change, discuss the problem and intended direction in an
   issue first. Do not treat proposed or deferred product requirements as
   implemented behavior.

## Local development

The repository currently requires Node.js 24 or newer and pnpm 12. The canonical
setup instructions are maintained in the
[development guide](https://github.com/vyasen-org/vyasen/blob/develop/docs/development.md)
and [root CONTRIBUTING guide](https://github.com/vyasen-org/vyasen/blob/develop/CONTRIBUTING.md).

For the documentation app:

```sh
pnpm install
pnpm --filter @vyasen/docs start
pnpm --filter @vyasen/docs typecheck
pnpm --filter @vyasen/docs build
```

## Pull requests

- Keep changes focused and follow the existing TypeScript, validation, and
  accessibility patterns.
- Add or update tests for behavior changes.
- Run relevant checks and describe what you verified.
- Link the related issue and note any assumptions or deferred work.

See the repository’s [contribution guide](https://github.com/vyasen-org/vyasen/blob/develop/CONTRIBUTING.md)
for branch, code review, and pull request conventions.

## Security reports

Do not disclose a suspected vulnerability in a public issue or pull request.
Follow the [security policy](https://github.com/vyasen-org/vyasen/blob/develop/SECURITY.md)
for private reporting.
