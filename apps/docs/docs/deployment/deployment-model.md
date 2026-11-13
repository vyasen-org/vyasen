---
title: Deployment model
description: Current repository deployment configuration and the limits of the self-hosting guidance.
---

# Deployment model

Vyasen has an **intended hosted and self-hosted product direction**. The
repository also contains a development deployment workflow. These are different
things: the current configuration does not yet establish a complete, supported
self-hosting product or service-level guarantees.

## Current repository deployment configuration

The checked-in configuration describes:

- The web application built as static assets and deployed to Cloudflare Pages.
- The API deployed on Render, with its health check at `/api/v1/health`.
- PostgreSQL configured separately through a deployment environment variable.
- A `develop` branch workflow that runs database migrations before triggering
  the API deployment and web build/deployment.
- The public Project Hub built and deployed separately as static files; it does
  not need the application API or database.

Cloud provider plans and free tiers can change. This repository does not
guarantee that a deployment, its traffic, its database, or future integrations
will remain free.

## Deployment and authentication boundary

The docs site is public and does not sign users in, make authenticated API
requests, or read the native application session. Its Cloudflare deployment
does not add the docs origin to the API's authenticated web origins.

The repository's Render blueprint scopes the API session cookie to
`api.vyasen.com`. A source change does not update an already-configured Render
service by itself; verify the live environment before deployment. Keep session
cookies scoped to the service that needs them; do not broaden them to a parent
domain merely to make the docs feel connected. Any future account-aware docs
feature needs a separate security review and explicit deployment decision.

## Local development

The repository's [development setup guide](https://github.com/vyasen-org/vyasen/blob/develop/docs/development.md)
describes local PostgreSQL, migrations, and starting the web and API processes.
It is a development setup guide, not a production self-hosting runbook.

## Self-hosting status

Self-hosting is an intended product direction, but operators should treat a
complete self-host deployment guide, supported infrastructure matrix, backup
and recovery procedure, and production hardening checklist as **not yet
published**. Follow the evolving project documentation and review the current
repository configuration before deploying.
