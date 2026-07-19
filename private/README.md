# Private surfaces

This directory holds **owner-only** applications that are **not** part of the public Waypoint Studio product suite.

## Rules

- Do **not** register these apps in `nav-registry.json`, `wds-app-nav-config.js`, `product-registry.json`, `wds-platform-catalog.js`, `sitemap.xml`, or marketing pages.
- Pages deploy **excludes** this tree (see `.github/workflows/pages.yml`).
- `robots.txt` disallows `/private/`.
- Personal knowledge lives in the browser (IndexedDB), not in committed JSON.
- Owner secrets for the University server live in `university/server/.env` (gitignored).

## Contents

| Path | Purpose |
|------|---------|
| `university/` | Waypoint University — private lifelong knowledge OS |
| `university/ACCESS.md` | **Exact launch URL, auth setup, backup, recovery** |
| `university/start.sh` | Owner server launcher |

## Launch University

```bash
cd private/university
./start.sh setup   # once
./start.sh
# http://127.0.0.1:8787/
```
