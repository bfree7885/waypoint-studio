# Home RC1.2 Footer — Production Delivery Incident

**Status:** HOME RC1.2 FOOTER LIVE AND VERIFIED  
**Date:** 2026-07-23  
**Domain:** `https://waypointstudio.org/`  
**Release:** `00cddd3` — `fix(home): simplify footer to Contact, Privacy, Terms`

---

## Root cause

**No delivery defect.** `00cddd3` reached `origin/main`, GitHub Pages built and deployed that exact SHA, and production already serves the RC1.2 shared-shell footer. Source, Pages artifact fingerprint (`data/build-info.json`), live `wds-app-shell.js`, and rendered DOM all match.

Reported “live still shows previous footer” was **not reproducible** against origin / Pages / live after the successful deploy (workflow run `29978803630`, completed ~1 minute after push). Likely premature observation during the short Pages window, or conflating primary nav (Home · Scenes · Sheds · Articles · About) with the trust footer.

**Not:** wrong artifact directory, revert, second Home implementation, stale hashed shell vs origin, or incorrect `00cddd3` source.

---

## SHAs

| Item | Value |
|------|--------|
| Local branch (investigation) | `integration/dashboard-phase2-publish` |
| Local HEAD | `00cddd32236a652ad8721979055bb0611a1d9bd0` (`00cddd3`) |
| `origin/main` | `00cddd32236a652ad8721979055bb0611a1d9bd0` (`00cddd3`) |
| `00cddd3` ancestor of `origin/main`? | **Yes** (identical) |
| Release / intended ship | **`00cddd3`** |
| Pages workflow checkout SHA | **`00cddd3`** (run [29978803630](https://github.com/bfree7885/waypoint-studio/actions/runs/29978803630)) |
| Deployed artifact / live build SHA | **`00cddd3`** (`data/build-info.json`, `source=github-pages`, `workflowRunId=29978803630`) |
| Docs follow-up (this incident) | **`f63c867`** (`f63c867c2db60e33100f938f06528e0ed6128544`) — descendant of `00cddd3` |

---

## Deployment facts

| Fact | Evidence |
|------|----------|
| Pages source | `.github/workflows/pages.yml` — `on.push.branches: [main]`, artifact `path: .` (repo root) |
| Pages after `00cddd3`? | **Yes** — push event, `head_sha=00cddd3`, build + deploy + verify all **success** |
| Checkout | `actions/checkout@v4` @ `github.sha` = `00cddd3` |
| Artifact upload | `actions/upload-pages-artifact@v3` path `.` |
| Deploy | `actions/deploy-pages@v4` success |
| Verify job | `automation/verify-production-deploy.mjs` success against `https://waypointstudio.org` |
| Later restore of old footer? | **No** — `git log 00cddd3..origin/main` empty at investigation |
| CDN | Fastly (`via: 1.1 varnish`, `cache-control: max-age=600`); origin `last-modified` matches deploy time; cache-bust fetches returned RC1.2 content |

---

## Source footer evidence (`00cddd3` / `origin/main`)

Footer is JS-rendered from shared `renderFooter()` in `design-system/js/platform/wds-app-shell.js` (loaded via `design-system/js/wds.js`). Intended KEEP set only:

- Contact  
- Privacy Policy → `privacy.html`  
- Terms of Service → `terms.html`  

Not present: Support, Coming later, Something wrong?, Suggest an idea, About, Home/brand href, legacy product/website IA.

```js
// Home RC1.2 — minimal trust footer (Contact · Privacy Policy · Terms).
'<a href="' + esc(contactBase) + '">Contact</a>' +
'<a href="' + esc(studioPageHref(home, "privacy.html")) + '">Privacy Policy</a>' +
'<a href="' + esc(studioPageHref(home, "terms.html")) + '">Terms of Service</a>' +
```

Also shipped: `terms.html`, `contact-config.json` `pages.terms`, sitemap entry, Home/contact/routes tests.

---

## Deployed artifact / live script evidence

| Check | Result |
|-------|--------|
| `GET /data/build-info.json` (cache-bust) | `commit=00cddd32236a652ad8721979055bb0611a1d9bd0`, `shortCommit=00cddd3`, `workflowRunId=29978803630` |
| `GET /` meta | `waypoint-build` content `00cddd3`; shell CSS/JS query `?v=00cddd3` |
| Live `wds-app-shell.js` | Contains Home RC1.2 `renderFooter`; SHA-256 **matches** local tree at `00cddd3` |
| `GET /terms.html` | **200** |

---

## Live production footer evidence (rendered DOM)

Headless Chrome CDP against production (ignore-cache reload), Pike County seed:

| Surface | Footer text | Links |
|---------|-------------|-------|
| `/` desktop | `Home · Private by default · Waypoint Studio` + Contact / Privacy Policy / Terms of Service | Contact → `/apps/dashboard/contact.html` (200); Privacy → `/privacy.html` (200); Terms → `/terms.html` (200) |
| `/` phone | Same | Same |
| `/apps/dashboard/` | Same labels (depth-adjusted hrefs) | Contact → `contact.html`; Privacy/Terms → `../../privacy.html` / `../../terms.html` |

Banned historical footer labels: **absent**. Primary nav unchanged (not part of footer KEEP/REMOVE).

Screenshots + machine meta:

- [`home-rc1.2-footer-production/01-desktop-home-footer.png`](./home-rc1.2-footer-production/01-desktop-home-footer.png)
- [`home-rc1.2-footer-production/02-phone-home-footer.png`](./home-rc1.2-footer-production/02-phone-home-footer.png)
- [`home-rc1.2-footer-production/verify-meta.json`](./home-rc1.2-footer-production/verify-meta.json)

---

## Fix performed

**None required for product delivery** — release was already live. This block only:

1. Established the twelve fact checklist (branch/SHAs, source, Pages, live fingerprint, artifact footer, no revert).  
2. Verified rendered production footer (desktop + phone + dashboard).  
3. Re-ran Home RC1 (52), contact platform (121), dashboard OS routes (36), local production link validation (0 broken).  
4. Documented incident + screenshots; playbook lesson.

No footer redesign, no extra links, no Home styling changes, no second Home implementation.

---

## Files changed (this incident follow-up)

| File | Change |
|------|--------|
| `docs/rebuild-2026/home-rc1.2-footer-production-incident.md` | This report |
| `docs/rebuild-2026/home-rc1.2-footer-production/*` | Live screenshots + `verify-meta.json` |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons Learned entry |

---

## Tests

| Suite | Result |
|-------|--------|
| `automation/test-home-rc1.mjs` | **52 passed** |
| `automation/test-contact-platform.mjs` | **121 passed** |
| `automation/test-dashboard-os-routes.mjs` | **36 passed** |
| `automation/validate-production-links.mjs` | **0 broken** (6 pre-existing article mount warnings) |
| Production CDP footer verify | **PASS** (desktop, phone, `/apps/dashboard/`) |

---

## Mandatory live checklist

| Requirement | Result |
|-------------|--------|
| `/` loads new Home | **PASS** (`data-product-name="Home"`, build `00cddd3`) |
| Footer Contact, Privacy Policy, Terms only | **PASS** |
| No old footer nav | **PASS** |
| Retained links resolve (200, no loops) | **PASS** |
| Desktop + mobile footer correct | **PASS** |
| `/apps/dashboard/` no retired footer | **PASS** |
| Live build SHA is `00cddd3` or documented descendant | **PASS** (`00cddd3`; docs follow-up documented after push) |
| Shared Home / shell implementation preserved | **PASS** (`renderFooter` only) |

---

## Rollback

If RC1.2 footer must be withdrawn (owner decision):

```bash
git revert 00cddd3
git push origin main
# Wait for Pages; confirm live build-info and rendered .was-footer
```

That restores prior shared-shell footer (Support / Coming later / Something wrong? / Suggest an idea / About / Privacy + home href). Prefer a new forward fix over hard reset.

---

## Final status

HOME RC1.2 FOOTER LIVE AND VERIFIED
