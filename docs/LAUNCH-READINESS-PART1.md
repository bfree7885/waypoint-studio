# Launch Readiness — Part 1

**Branch:** `recovery/rc3-consolidation`  
**Date:** 2026-07-21  
**Commit message:** `fix(ux): resolve critical launch blockers part 1`  
**Scope:** Eliminate Critical issues #1–#4 from `OWNER-READINESS-AUDIT.md` without new features or redesigns.

---

## Issues addressed

### C2 — Two entry systems → one primary destination

| Product | Primary destination (nav · home · clarity redirect) |
|---------|------------------------------------------------------|
| Dashboard | `apps/dashboard/` |
| Scenes | `apps/photo-coach/` |
| Sheds | `apps/shed-hunting/map/` |
| Volunteer | `apps/waypoint-volunteer/discover.html` |

- `studioPrimaryNav` hrefs aligned with `startHere`
- Explore launcher cards use `startHereHref`
- Clarity routes `/scenes/`, `/sheds/`, `/volunteer/` redirect to the same primaries
- Overview / journey pages remain reachable from local “About / Today” links (secondary), not from primary chrome

### C3 — Software language

Replaced visitor-facing terms including:

| Was | Now |
|-----|-----|
| Applications | Explore |
| Apps (button) | Explore |
| Shared platform layer | Learn while you’re out |
| Opportunity Intelligence | Nearby ways to help / Finding good nearby |
| Customize Dashboard | Adjust what you see |
| Report bug / Request feature | Something wrong? / Suggest an idea |
| Incubator (footer) | Coming later |
| Intelligence (category) | Reading the land |
| Foundation / Planned chips | Early look / Coming later |
| Shell is ready… | Honest waiting copy (no engineering voice) |

### C1 — Visual identity

- Added flexible identity system: `assets/images/identity/manifest.json` + `wds-experience-identity.js`
- Distinct temporary SVG placeholders per experience (home sky, dashboard sky, scenes craft, sheds forest, volunteer stewardship)
- Home + Scenes wired to identity; Sheds/Volunteer stages accept identity backgrounds
- Owner photography path documented in `assets/images/identity/README.md` — placeholders clearly labeled, not permanent stock

### C4 — Trust

- Cached weather no longer labeled **Live** (was a trust defect)
- Availability labels: Live / Cached / Offline / Unavailable / Estimated / Partial / Coming later
- Widget cards show **Last updated** or an explicit non-certainty note when stale/unavailable
- Brief trust notes for cached / offline / partial
- Empty brief copy no longer mentions shell/customize engineering

### Polish

- Removed duplicate “How is today?” eyebrow under the same Dashboard title
- Homepage Take is companion voice, not a product map
- Scenes primary CTA aligned with nav (“Review today’s shoot”)

---

## Screens modified

- `index.html`, `js/home-hero.js`, `js/studio-home.js`
- `apps/scenes/index.html`
- `apps/shed-hunting/index.html`, `css/sheds-home.css`
- `apps/waypoint-volunteer/index.html`, `css/volunteer-home.css`, `discover.html`, `data/foundation.json`
- `articles/index.html`
- `scenes/index.html`, `sheds/index.html`, `volunteer/index.html` (clarity redirects)
- `support.html`
- Dashboard V3 shell / brief / contract / customize / V2 widgets availability
- Platform: `wds-app-nav-config.js`, `wds-app-shell.js`, `wds-take.js`, `wds-volunteer-discover.js`
- New: identity manifest, SVG placeholders, `wds-experience-identity.js`
- Test: `automation/test-dashboard-v3.mjs` (copy assertion)

---

## Remaining launch blockers

| Blocker | Severity | Notes |
|---------|----------|-------|
| Owner photography not yet installed | High | SVGs are honest placeholders — ship only after real photos or accept placeholder launch |
| Fresh visual QA pack (desktop/tablet/mobile screenshots) | Critical process | Re-capture after this commit |
| Dashboard live provider failure UX in the wild | High | Labels improved; real outage still needs owner walkthrough |
| Scenes overview / Photo Coach URL split | Medium | Primary entry unified; deep URLs still dual |
| Mobile nav density (6 peers) | High (audit H1) | Deferred — not in Part 1 critical four |
| Incubator still on homepage body | Medium | Footer softened; home list remains |
| Volunteer/Sheds overview pages still exist | Low | Secondary only; ok if not linked from primary chrome |

---

## Risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Bookmarks to `/apps/scenes/` still open journey landing | Low | Intentional secondary path; primary nav goes to Coach |
| SVG heroes feel unfinished vs photography | Med | Manifest swap to owner files; no code redesign required |
| Explore launcher still lists many experiences | Low | Uses startHere; language softened |
| Test suite RC2 experience tests still expect old home pillars | Low | Pre-existing; not expanded this sprint |
| Breaking “Customize Dashboard” string dependents | Low | Test updated; dialog title aligned |

**Overall:** Part 1 clears the four named critical launch blockers in code. **Do not treat as production-ready** until owner photography and a fresh visual QA pass land (see remaining blockers).

---

## How to verify

```bash
cd ~/Projects/waypoint-studio
git checkout recovery/rc3-consolidation
python3 -m http.server 8080
```

Check: primary nav Scenes/Sheds/Volunteer destinations match homepage cards; heroes differ; Dashboard trust labels; no “Opportunity Intelligence” / “Applications” in visitor chrome.

```bash
node automation/test-dashboard-v3.mjs
node automation/test-production-repair.mjs
```
