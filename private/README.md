# Private surfaces

This directory holds **owner-only** applications that are **not** part of the public Waypoint Studio product suite.

## Rules

- Do **not** register these apps in `nav-registry.json`, `wds-app-nav-config.js`, `product-registry.json`, `wds-platform-catalog.js`, `sitemap.xml`, or marketing pages.
- Pages deploy **excludes** this tree (see `.github/workflows/pages.yml`).
- `robots.txt` disallows `/private/`.
- Personal knowledge lives in the browser (IndexedDB / localStorage), not in committed JSON.

## Contents

| Path | Purpose |
|------|---------|
| `university/` | Waypoint University — private lifelong knowledge OS |
