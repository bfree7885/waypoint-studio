# Link Audit — Waypoint Studio Production (2026-07)

**Evidence:** `link-extract.json`, `link-probe.json`, `broken-links.json`, `crawl-summary.json`

## Totals

| Metric | Count |
| --- | ---: |
| Links extracted from HTML | 674 |
| Unique same-origin destinations probed | 93 |
| Broken same-origin destinations | **0** |
| Localhost / 127.0.0.1 hrefs in public HTML | **0** (scan) |
| External links observed |  (see extract) |
| Favicon request failure | 1 (`/favicon.ico` 404) |

## Method

1. Seed known product, legal, incubator, and documented routes.
2. Expand from `sitemap.xml`.
3. Extract `a`/`link`/`area` hrefs from every HTML response.
4. Probe unique same-origin destinations (follow redirects, cache-bust).
5. Browser capture verified primary workflows with clean context.

## Findings

### Intact

- Primary nav destinations (Home, Scenes, Sheds, Articles, About) resolve.
- Footer legal links resolve.
- Dashboard ↔ Customize hash navigation works in browser capture.
- Redirect aliases (`/dashboard.html`, `/sheds/`, `/map/`, `/scenes/`) land on intended apps.

### Defective or risky destinations

| Issue ID | Severity | Finding |
| --- | --- | --- |
| LINK-001 | P2 | Support page CTA “Coming later” → `/incubator/` — unfinished language in primary support path |
| LINK-002 | P2 | Scene Builder preview promotes “early Scene Builder” → `/apps/waypoint-scenes/` (legacy monolith) |
| LINK-003 | P1 | Portfolio routes referenced in vision/docs/feature work return **404** on production |
| LINK-004 | P3 | `/favicon.ico` 404 (browser network failure) |
| LINK-005 | P2 | `/status.html` and `/debug.html` publicly fetchable despite robots Disallow |
| LINK-006 | P3 | Inconsistent `?v=` cache-bust tokens across pages (`dash-tile-layout-1` vs `59c09de` vs `local`) |

### Orphan / inaccessible intended products

- Scenes Portfolio suite (Assistant, Builder, Health, Output) — source on feature branches only.
- Desktop Importer — not a web route; Pages returns 404 for `/waypoint-importer/`.
- Outdoor Journals — no route.

### Security attributes

- External FormSubmit / mailto used on Contact — appropriate for static hosting.
- Spot-check: no `localhost` destinations in public HTML crawl.
- Full `rel="noopener"` audit of every external target not exhaustively automated; no hostile javascript: links found.

## Conclusion

Link graph integrity is **relatively strong** (0 broken internal probes). The larger problem is **links and copy that correctly resolve to unfinished or competing surfaces**, which fails the “200 ≠ healthy” rule.
