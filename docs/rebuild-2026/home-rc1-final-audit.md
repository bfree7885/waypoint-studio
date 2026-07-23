# Home RC1 — Final Production Audit

**Status:** AUDIT COMPLETE (re-verified) — no commit / push / merge / deploy
**Date:** 2026-07-23 (refresh)
**Auditor:** local release-candidate re-audit (implementation unchanged)
**Authority:**
- `docs/rebuild-2026/home-vision-lock-owner-review.md`
- `docs/rebuild-2026/home-implementation-rc1-owner-review.md`
- `docs/WAYPOINT-STUDIO-CONSTITUTION.md` (Home lock)
- Phase 1/2 owner reviews · Phase 2 visual baseline `docs/rebuild-2026/phase2/`
- Existing RC1 captures `docs/rebuild-2026/home-rc1/`
- `docs/rebuild-2026/DASHBOARD-BASELINE.md` — **not present** in tree (N/A)

**Fresh audit evidence:** `docs/rebuild-2026/home-rc1-audit/`
**Runtime probe:** `docs/rebuild-2026/home-rc1-audit/audit-runtime.json`
**Probe time:** `2026-07-23T03:12:33.236Z` against `http://127.0.0.1:8765`

---

## Verdict

# READY TO SHIP

Local Home RC1 still matches the vision lock: one Rebuild implementation at `/` and `/apps/dashboard/`, Phase 2 chrome preserved, deepeners append-only, constitution Home lock intact, automated gates green. Re-verification found **no new blocking defects**.

**Blocking issues:** none.

**Post-deploy gate (constitution §8):** do not claim public success until ordinary-URL multi-UA verify proves live `/` is Rebuild Home (today production `/` is still marketing `studio-home`).

---

## Method (this refresh)

| Step | Result |
|------|--------|
| Local static serve `http://127.0.0.1:8765` | Available |
| `node automation/test-home-rc1.mjs` | **37/37 PASS** |
| `node automation/test-dashboard-rebuild-phase1.mjs` | **88/88 PASS** |
| `node automation/test-dashboard-rebuild-phase2.mjs` | **94/94 PASS** |
| `node automation/test-dashboard-rebuild-phase3.mjs` | **100/100 PASS** |
| `node automation/test-waypoint-constitution.mjs` | **PASS** (Home lock assertions) |
| `node automation/test-dashboard-os-routes.mjs` | **40/40 PASS** |
| `node automation/verify-dashboard-production.mjs` | Ran — production still pre-Home (expected) |
| Curl `/`, `/apps/dashboard/`, `/apps/dashboard/index.html`, `/dashboard.html`, manifest | **200**; Rebuild hosts label Home |
| Chrome CDP runtime probe (fold, console, keyboard, legacy text) | Screenshots + `audit-runtime.json` refreshed |
| Visual compare Phase 2 ↔ Home RC1 audit captures | Documented below |
| Grep legacy public strings | Differentiated archived / internal / visible |

No implementation changes were made during this audit.

---

## 1. Home experience — single source of truth

| Check | Result |
|-------|--------|
| `/` mounts Rebuild Home | **PASS** — quiet Rebuild host, title `Home — Waypoint Studio`, `data-product-name="Home"` |
| `/apps/dashboard/` same implementation | **PASS** — identical CSS/JS boot chain (`wds.js` + `home-boot.js?v=home-rc1`) |
| `/apps/dashboard/index.html` | **PASS** — same host as alias |
| One SoT (no forked Home tree) | **PASS** — shared `apps/dashboard/js/home-boot.js` + `design-system/js/dashboard/rebuild/*` |
| No marketing homepage modules on `/` | **PASS** — no `studio-home.js` / `was-home-hero` on root host |
| Prefs key unchanged | **PASS** — `waypoint-dashboard-rebuild-prefs-v1` |
| Internal `data-product="dashboard"` retained | **PASS** — allowed internal name |
| `home-boot.js` does not boot Outdoor OS | **PASS** — comment + mount path are Rebuild-only |

Hosts differ only by path depth (`shell-depth` 0 vs 1) and root-only extras (favicon / OG). Same Rebuild modules paint both URLs.

---

## 2. Visual lock vs Phase 2 baseline

Compared `docs/rebuild-2026/phase2/01-desktop-workspace.png` (+ phone) to refreshed audit captures.

### Preserved (lock held)

- Dark Rebuild shell, card chrome, trust badges (Live / Estimated / Partial / Waiting / Unavailable)
- Today Outside + Workspace composition and typography (serif titles / sans data)
- Local chrome: **Workspace · Customize · Kiosk**
- Quiet brand row (Waypoint Studio mark + product label)
- Observational voice; no Outdoor OS / Recovery briefing composition

### Differences (all intentional or environmental — not redesign drift)

| Difference | Classification |
|------------|----------------|
| Product label **DASHBOARD → HOME** | Intentional M2 labeling |
| Footer **Dashboard → Home** | Intentional M2 labeling |
| Default widgets: Photography + Rivers **off**; **Alerts on** | Intentional RC1 defaults |
| Below-fold deepeners (Articles · Take · Photography · Scenes · Sheds) | Intentional M3 append-only |
| Live weather/numbers differ (time of day / providers) | Environmental data, not visual redesign |
| Light/Air may show honest Unavailable at night / provider miss | Honest empty — not chrome regression |
| Desktop first viewport shows ~145px of “Latest Articles” (1440×900); tablet ~292px peek (834×1112) because five defaults are shorter than Phase 2’s six-card grid | Side-effect of defaults; Workspace still dominates; phone keeps deepeners fully below fold (`articlesTop` 1290 > `vh` 844) |

**No unauthorized redesign** of Phase 2 colors, spacing system, card language, or shell.

---

## 3. Legacy removal

| Name | Archived docs | Internal code | Production-visible on Home RC1 |
|------|---------------|---------------|--------------------------------|
| Outdoor OS | Yes (historical) | `design-system/js/dashboard/os/*` still in `wds.js` load list; **not mounted** by Home | **Absent** (runtime legacy probe `outdoorOS: false`) |
| Outdoor overview | Removed from Support Experiences copy | — | **Absent** on Home |
| Dashboard as primary user name | — | Module paths / comments OK | Home shell says **Home**; residual “Dashboard” only in **sample article** blurb + Contact page (see Non-blocking) |
| Volunteer / SignalTerrain / Steepleaf / Savant / Fieldry | Apps still exist | Nav registry entries remain | **Not** in quiet Home chrome / studio primary nav |

Studio primary nav config: **Home · Scenes · Sheds · Articles · About** (quiet Rebuild hides studio primary; local Workspace/Customize/Kiosk only).

`support.html` still uses `data-product="studio-home"` and lists incubator apps under Experiences as a **support directory** — acceptable for Support; not Home chrome regression.

`status.html` references `studio-home` only as a detection string for health checks — internal tooling, not public Home IA.

---

## 4. Home flow (desktop / tablet / mobile)

### Above the fold (Workspace view)

| Element | Desktop | Tablet | Phone |
|---------|---------|--------|-------|
| Brand + **Home** + Workspace/Customize/Kiosk | Yes | Yes | Yes |
| Today Outside | Yes | Yes | Yes |
| Workspace instruments | Yes | Yes | Yes (stacked; Air may start below fold) |

### Below the fold (order verified in runtime)

1. Latest Articles
2. Waypoint’s Take (editorial; “NOT A SCORE”)
3. Featured Photography (honest placeholder)
4. Scenes intro + link (no embed)
5. Sheds intro + link (no embed)
6. Footer (Contact · Support · About · Privacy · trust links)

Deepeners omitted on Customize / Kiosk (contract tests). They **support** Workspace; they do not replace shell/widgets.

Fold metrics (seeded Pike County, cleared prefs): see `audit-runtime.json`.

---

## 5. First-time visitor

| Check | Result |
|-------|--------|
| Defaults | Conditions · Light · Air · Astronomy · Alerts |
| Coming-soon Photography / Rivers off until Customize | **PASS** |
| Honest empty / waiting | Alerts “No alerts to show yet”; Unavailable Light/Air labeled honestly when providers miss |
| Boot copy | “Opening workspace…” then progressive settle (`bootGone: true`) |
| Marketing-first | **Absent** — no hero CTA marketing IA |
| Nav clarity | Home label + Workspace/Customize/Kiosk; brand → Home |

---

## 6. Routing

| URL | Behavior |
|-----|----------|
| `/` | Rebuild Home (200) |
| `/apps/dashboard/` | Same Rebuild (permanent alias, 200) |
| `/apps/dashboard/index.html` | Same Rebuild (200) |
| `/dashboard.html` | Meta refresh + `location.replace("./" + hash)` → `/` |
| Canonical | Both hosts → `https://waypointstudio.org/` |
| Redirect loops | **None** observed |
| Bookmarks | Alias path preserved |

PWA `site.webmanifest`: `start_url: "/"`, Home-oriented description.

---

## 7. Performance

| Probe | Result |
|-------|--------|
| Shell / Rebuild mount | Boot cleared; Today + Workspace mounted |
| CLS proxy (`deepenTopDelta`) | **0** across probed viewports |
| Console errors (root `/`) | **None** |
| Network ≥400 (root) | **None** material |
| Alias `/apps/dashboard/` | Console 404 noise (browser default `/favicon.ico` — root ships `favicon.svg` only; cosmetic) |
| Fonts | Non-blocking Google Fonts pattern retained from Phase 2 |

No frozen shell; progressive hydrate pattern intact.

---

## 8. Accessibility

| Check | Result |
|-------|--------|
| Skip link | Present → `#main`; receives focus |
| Keyboard | Tab from skip → brand; visible focus outline (`rgb(200, 240, 85) solid 2px`) |
| Headings | `h1` Home (sr-only) → `h2` Today Outside / Workspace → widget `h3` → deepener `h2`s |
| ARIA | Region busy cleared after mount |
| Contrast | Light text on dark Rebuild chrome (Phase 2 lock) — no new low-contrast chrome found |

Quiet chrome correctly suppresses studio primary list in the shell; local feature nav remains operable (visible in screenshots).

---

## 9. Constitution — no architectural drift

| Lock item | Status |
|-----------|--------|
| Home canonical at `/` | Local **PASS** |
| Phase 2 visual language locked | **PASS** |
| Marketing homepage retired as authority | Local host **PASS** |
| Scenes/Sheds linked, not embedded | **PASS** |
| Dashboard internal name | **PASS** (residual sample/contact copy noted) |
| Observational, not Outdoor OS | **PASS** |
| Historical eras reference-only | **PASS** on Home mount |
| Delivery honesty | **PASS as audit framing** — production still dual until deploy |

Constitution automated tests assert Home lock language.

---

## 10. Production reality (honesty)

| Surface | Live now (2026-07-23 probe) | After this RC deploys |
|---------|----------------------------|------------------------|
| `https://waypointstudio.org/` | Marketing `studio-home` / `was-home-hero` | Rebuild Home |
| `https://waypointstudio.org/apps/dashboard/` | Rebuild; title still **Dashboard** (`rebuild-p2`) | Same Rebuild; title **Home** |
| Build | `bbfdfb2` (GitHub Pages) | New deploy SHA |

`verify-dashboard-production.mjs` interpretation still: homepage is studio-home; Dashboard alias is Rebuild — failures must name which surface. Local READY TO SHIP ≠ live Home yet.

---

## Non-blocking follow-ups (do not block ship)

1. **Sample article copy** on Home deepeners still says “How Dashboard, ForageCast, and Fieldry…” (`articles/manifest.json`). Marked Sample; update when editorial refreshes.
2. **`apps/dashboard/contact.html`** still user-labels **Dashboard** (“Back to Dashboard”, title/meta).
3. **`support.html` Experiences** still lists Volunteer / SignalTerrain / Steepleaf / Savant / Fieldry as a directory (OK for Support; not Home chrome).
4. **Desktop/tablet Articles peek** into first viewport with five default widgets — optional spacing/min-height polish later; not a redesign.
5. **Favicon.ico 404** noise on alias path — add `favicon.ico` or link SVG on dashboard host if desired.
6. **Post-deploy verify** of ordinary `/` and `/apps/dashboard/` across UAs (constitution delivery honesty).

---

## Tests summary

```
Home RC1 .............. 37 passed
Phase 1 ............... 88 passed
Phase 2 ............... 94 passed
Phase 3 ............... 100 passed
Constitution .......... passed
Dashboard OS routes ... 40 passed
```

---

## Audit artifacts

| Path | Role |
|------|------|
| `docs/rebuild-2026/home-rc1-final-audit.md` | This report (definitive) |
| `docs/rebuild-2026/home-rc1-audit/01-desktop-root.png` | Fresh desktop `/` |
| `docs/rebuild-2026/home-rc1-audit/01-desktop-alias.png` | Fresh `/apps/dashboard/` |
| `docs/rebuild-2026/home-rc1-audit/01-desktop-alias-index.png` | Fresh `index.html` alias |
| `docs/rebuild-2026/home-rc1-audit/01-tablet-root.png` | Fresh tablet |
| `docs/rebuild-2026/home-rc1-audit/01-phone-root.png` | Fresh phone |
| `docs/rebuild-2026/home-rc1-audit/02-desktop-deepeners.png` | Deepener band |
| `docs/rebuild-2026/home-rc1-audit/audit-runtime.json` | Fold / console / a11y probes |
| `docs/rebuild-2026/home-rc1/*` | Prior RC1 owner-review captures (still valid) |

---

## Conclusion

**READY TO SHIP**

**Blocking issues:** none.

Owner may authorize commit / deploy when ready. After deploy, treat public Home as unproven until ordinary-URL multi-UA verification passes for both `/` and `/apps/dashboard/`.
