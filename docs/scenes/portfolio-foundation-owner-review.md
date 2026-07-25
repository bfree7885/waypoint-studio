# Scenes Portfolio Foundation — Owner Review

**Date:** 2026-07-24  
**Branch:** `feature/scenes-portfolio-foundation`  
**Base (`origin/main`):** `0be5f9fb23f0b0f024794ea2542df502416537f1`  
**Implementation commit:** `4f8d18c7345b36fc264e0cc9ff28047308e8db1c`  
**Final commit SHA:** `7ea3ec2de9ca318089c46f17256fa54bf309752f`
**Deployment status:** **Not deployed** · **Not merged to main**  
**Dashboard / Sheds:** Untouched

---

## Executive summary

Scenes already had a working photography craft loop (Photo Library + Photo Coach Shoot Review). This sprint adds the smallest durable **Purpose Portfolio** workspace: create/name/purpose, add/remove/reorder library photographs, set cover, save/reopen/rename/delete with confirmation, and observational candidate suggestions when private labels or analysis exist — never fake sample portfolios.

---

## Reconciliation summary

Full note: [`docs/scenes/current-state-reconciliation.md`](./current-state-reconciliation.md)

- Working: Photo Library (IndexedDB originals + metadata), Shoot Review labels, Coach session history (misleadingly named “portfolio”), HL experimental studio, Scenes hub.
- Incomplete: Living Scenes, fuller Scene Builder, Profile module preview vs live companion.
- Naming risk: Coach “portfolio” ≠ purpose portfolios; Collections ≠ purpose portfolios.
- Recommendation executed: Portfolio Foundation on real Library ids, local-first.

---

## What was built

| Capability | Behavior |
|------------|----------|
| Portfolio list | Honest empty state; no demo data |
| Create / rename / describe / purpose / notes | Editable fields; save on blur/change/button |
| Add from library | Picker over private Photo Library index |
| Remove / reorder / cover | Per-image controls; cover stays in membership |
| Delete | Confirm dialog; library photos retained |
| Suggestions | From favorite / Keep / Maybe / rating / coach grade / similarity when evidence exists |
| Insufficient data | Clear status; manual selection still works |
| Navigation | Scenes home journey + local nav “Portfolios” + smoke route |

**Route:** `/apps/scenes/portfolio/`

---

## Data model

Storage: `localStorage` key `waypoint-scenes-portfolios-v1` (metadata only; blobs stay in Photo Library IndexedDB).

```
Portfolio {
  id, title, description, purpose,
  createdAt, updatedAt,
  coverImageId,
  imageIds[],              // ordered LibraryImage refs
  items[{ imageId, notes, selectionRationale, addedAt, source }],
  notes,
  health: null,            // reserved for Portfolio Health
  private: true
}
```

---

## Candidate logic + honesty framing

Labels used (not objective truth):

- **Suggested** — favorite / Keep / stronger coach grade when analyzed  
- **Likely candidate** — high private rating / relatively high session score  
- **Worth reviewing** — Maybe / mid rating / middling grade  
- **Similar to another selection** — fingerprint / same file identity / similar framing+month vs current set  

Copy framing: “suggestions… never a scoreboard.” Rejected frames excluded. No suggestions fabricated when evidence is absent.

---

## Files changed (primary)

- `apps/scenes/portfolio/**` — workspace HTML/CSS/JS (models, store, candidates, engine, UI, boot)
- `apps/scenes/index.html` — journey + Later link
- `apps/scenes/data/experiences.json` — portfolio experience entry
- `apps/scenes/docs/ARCHITECTURE.md` — documented module
- `design-system/js/platform/wds-app-nav-config.js` + `design-system/ecosystem/nav-registry.json`
- `automation/test-scenes-portfolio.mjs` + smoke route
- `docs/scenes/current-state-reconciliation.md`
- `docs/ENGINEERING-PLAYBOOK.md` — lessons learned
- Screenshots under `docs/scenes/portfolio-foundation/`

---

## Tests

```bash
node automation/test-scenes-portfolio.mjs
```

**Result:** 52 assertions passed (CRUD, persistence, insufficient-data, candidate labels, similarity, a11y/responsive CSS, nav/smoke wiring).  
Also re-ran `node automation/test-photo-library.mjs` — passed (no regression).

---

## Screenshots

| File | View |
|------|------|
| `docs/scenes/portfolio-foundation/01-desktop-empty.png` | Desktop empty / honest library status |
| `docs/scenes/portfolio-foundation/02-phone-empty.png` | Phone empty |
| `docs/scenes/portfolio-foundation/03-desktop-editor.png` | Desktop editor with seeded library evidence |
| `docs/scenes/portfolio-foundation/04-phone-editor.png` | Phone editor |
| `docs/scenes/portfolio-foundation/05-scenes-home-portfolio-link.png` | Scenes home journey includes portfolios |

---

## Known limitations

- No Auto Portfolio Builder / AI narrative coach / Portfolio Health UI yet (`health` reserved null).
- Suggestions do not run pixel-level sharpness/background analysis — only existing metadata.
- Portfolios do not yet deep-link into Shoot Review selection write-back.
- Thumbnails require library thumbnail data URLs; missing library rows show honest “missing” copy.
- Headless screenshot seed used SVG placeholders for review imagery only — production never seeds fake portfolios.

---

## Remaining Portfolio Intelligence roadmap (brief)

1. Portfolio Assistant — purpose-aware prompts over an existing set  
2. Portfolio Coach — observational critique of set balance (season/subject/variety)  
3. Auto Portfolio Builder — optional draft sets from Keep/favorites (always editable)  
4. Purpose templates — gallery / journal / print / client select starters  
5. Portfolio Health — soft diagnostics into `health` metadata  

---

## Git / deploy confirmation

- Branched from `origin/main` (not a Dashboard feature branch)  
- **Not merged**  
- **Not deployed**  
- Dashboard and Sheds code paths not modified for product behavior (nav registry only gains a Scenes Portfolios feature entry)
