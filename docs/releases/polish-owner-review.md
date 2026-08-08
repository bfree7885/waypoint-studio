# Studio polish — owner review

**Date:** 2026-08-08  
**Branch:** `feature/studio-polish-release`  
**Commit:** `6e43ad2`  
**Base:** `origin/main` @ `1245c7c`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-polish`  
**Status:** Feature branch pushed for owner review. **Not merged. Not deployed.**

---

## 1. Executive summary

Release-facing visual/UX polish across Homepage (Dashboard), Scenes, Sheds, Articles, Side Trails, SignalTerrain, Global Signals, Support, About, Contact, and Incubator. No new features. Focus: unfinished feel — duplicate copy, low-contrast chrome, uneven controls, weak focus states, awkward journey wording, and meta “engineering” voice on public surfaces.

**Recommendation:** **APPROVE** for merge after a quick visual pass on Home (location prompt) + Articles + Side Trails. Parallel agents (design-consistency, placeholder-audit, live-status, performance) were still on `origin/main` at start — this branch stays within shared patterns and should rebase cleanly; document overlaps below if those land first.

---

## 2. Surfaces polished

| Surface | Path | Polish applied |
|---------|------|----------------|
| Home / Dashboard | `/`, `/apps/dashboard/` | Location search label contrast; Set button height; quiet nav readability / touch |
| About | `/about.html` | Hero balance, section spacing, contact/form chrome shared CSS |
| Support | `/support.html` | FAQ title wording; chatbot copy; FAQ/pill focus rings |
| Contact | `/contact.html` | Stronger form field borders on dark shell |
| Articles | `/articles/` | Removed duplicate hub lede; filter row alignment; provenance label humanized; control focus |
| Side Trails | `/side-trails/` | Softened meta copy; hide redundant ready status; 3-up desktop grid; description contrast |
| SignalTerrain | `/side-trails/signalterrain/` | “Existing app” → “Open app”; nav/support/CTA contrast + focus |
| Global Signals | `/side-trails/global-signals/` | Meta/summary contrast; list spacing; nav focus/contrast |
| Scenes | `/apps/scenes/` | Journey deduped/reordered; hero credit contrast |
| Sheds | `/apps/shed-hunting/` | Hero credit contrast |
| Incubator | `/incubator/` | “Existing app” → “Open app” |

Cache-bust query: `studio-polish-1` on touched shells.

---

## 3. Before / after screenshots

Directory: `docs/releases/polish-screenshots/`

| Surface | Before | After |
|---------|--------|-------|
| Home | `before/home-desktop.png` · `before/home-mobile.png` | `after/home-desktop.png` · `after/home-mobile.png` |
| About | `before/about-desktop.png` | `after/about-desktop.png` |
| Support | `before/support-desktop.png` | `after/support-desktop.png` |
| Articles | `before/articles-desktop.png` | `after/articles-desktop.png` |
| Side Trails | `before/side-trails-desktop.png` | `after/side-trails-desktop.png` |
| SignalTerrain | `before/signalterrain-desktop.png` | `after/signalterrain-desktop.png` |
| Global Signals | `before/global-signals-desktop.png` | `after/global-signals-desktop.png` |
| Scenes | `before/scenes-desktop.png` | `after/scenes-desktop.png` |
| Sheds | `before/sheds-desktop.png` | `after/sheds-desktop.png` |
| Dashboard | `before/dashboard-desktop.png` | `after/dashboard-desktop.png` |
| Contact | `before/contact-desktop.png` | `after/contact-desktop.png` |
| Incubator | `before/incubator-desktop.png` | `after/incubator-desktop.png` |

Mobile counterparts exist for each surface under the same folders.

---

## 4. Files changed (by purpose)

| Area | Paths |
|------|-------|
| Articles hub | `articles/index.html`, `design-system/js/platform/wds-articles-feed.js`, `design-system/css/wds-articles-feed.css` |
| Contact / Support / About chrome | `design-system/css/wds-contact.css`, `support.html`, `about.html`, `contact.html` |
| Location prompt | `design-system/css/wds-content-engine.css`, `design-system/js/wds-location.js` |
| Side Trails | `side-trails/index.html`, `data/side-trails/catalog.json`, `design-system/css/wds-side-trails.css`, `design-system/js/side-trails/wds-side-trails-app.js` |
| SignalTerrain | `side-trails/signalterrain/index.html`, `design-system/css/wds-signalterrain-landing.css` |
| Global Signals | `side-trails/global-signals/index.html`, `design-system/css/wds-global-signals-home.css` |
| Scenes / Sheds | `apps/scenes/index.html`, `apps/scenes/css/scenes-home.css`, `apps/shed-hunting/index.html`, `apps/shed-hunting/css/sheds-home.css` |
| Shell / Home | `design-system/css/wds-app-shell.css`, `index.html`, `apps/dashboard/index.html` |
| Incubator | `incubator/index.html` |
| Review package | `docs/releases/polish-owner-review.md`, `docs/releases/polish-screenshots/**` |

---

## 5. Parallel-agent overlaps

| Parallel track | Overlap risk | Notes |
|----------------|--------------|-------|
| design-consistency | Medium | Quiet nav opacity/size and contact/form tokens may collide — rebase carefully |
| placeholder-audit | Low | Did not invent data; provenance/status copy stays honest |
| live-status | Low | Health badge wording unchanged except Articles hub lede removal |
| performance | Low | Cache-bust only; no new requests |

Prefer this polish commit land before or after DS consistency as a small rebase, not a squash that rewrites tokens.

---

## 6. Remaining nits (out of scope / follow-ups)

1. **Explore control** still visually louder than primary architecture nav on some shells — intentional IA, but polish later if Explore is demoted.
2. **Side Trails card CTAs** mix “Explore …” vs “Open Global Signals” — catalog data, not layout.
3. **Side Trails card button vertical alignment** varies with description length — needs shared card footer push (`margin-top: auto`) if desired.
4. **Scenes hero** still repeats “Review today’s shoot” as title + primary CTA (product clarity > novelty).
5. **Global Signals sample/demo density** and short featured column — product/data, not chrome.
6. **Home location prompt** still blocks first paint until region choice — intentional; contrast/alignment only polished.
7. **Articles “Partial refresh”** health state is truthful; not a polish defect.
8. Browser MCP unavailable in this subagent environment — screenshots via Chromium headless.

---

## 7. Verification

- Local static server: `python3 -m http.server 8791` from polish worktree
- Desktop 1280×900 + mobile 390×844 captures for listed surfaces
- CSS brace balance checked on edited stylesheets
- No new features; no fabricated live data

---

## 8. Recommendation

**APPROVE** — ship as a polish-only merge when owner is satisfied with screenshots. Do not merge from this agent.
