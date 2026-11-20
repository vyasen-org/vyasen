---
title: Brand and design
description: The existing Vyasen visual reference and design choices used by the Project Hub.
---

# Brand and design

The Project Hub reuses the app's available Vyasen icon and follows the existing
platform's dark/light surface, border, and accent-led visual direction. The web
app's source icon is `apps/web/public/static/app-icon.jpg`; the docs build uses
the same image as its identity mark.

## Project Hub interface

- The documentation site has its own reading-first navigation and page layout;
  it does not duplicate the authenticated workspace sidebar.
- Dark and light modes use Docusaurus browser-side preferences. They do not
  read the native app's local storage, require sign-in, or call the API.
- Responsive docs navigation, keyboard focus visibility, semantic headings,
  reduced-motion support, readable article widths, and local search are part of
  the docs experience.

## Brand guide status

The repository currently provides an app icon and implemented UI tokens, but
does not include a complete published brand manual. Do not treat this page as a
formal specification of logo variants, typography, accessibility-approved
brand colors, or marketing usage. Those can be documented when maintainers
confirm them.
