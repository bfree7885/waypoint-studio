# Scenes Portfolio Coach — Owner Review

**Date:** 2026-07-24
**Branch:** `feature/scenes-portfolio-coach`
**Cut from:** `feature/scenes-portfolio-assistant`
**Starting SHA:** `714d7ce3b4b10dd3796ff8d88d57b14062c082c0` (expected tip after assistant `[skip ci]` publish — matches brief)
**Implementation commit:** *(this sprint’s feat commit; see `git log -1` after stamp)*
**Final SHA:** branch tip after docs stamp (see `git log -1`)
**Base assistant tip:** `714d7ce` (implementation `5780d05`, docs tip `2c65849`, then publish)
**Base foundation (meaningful tip):** `87fbd76`
**Base main (`origin/main`):** unchanged by this sprint
**Deployment status:** **Not deployed** · **Not merged**
**Dashboard / Sheds:** **Untouched** (no Dashboard or Sheds product files in diff)

---

## Executive summary

Portfolio Assistant already recommends explainable candidate categories. This
sprint adds **Portfolio Coach** inside the same workspace: a comparative mentor
that explains differences between two photographs using only on-device signals
the repo already produces. Structure is consistent — Observation → Why it may
matter → Tradeoff → Portfolio context → Your call — with qualitative confidence
(Higher / Moderate / Lower), inspectable evidence, and explicit user controls
(prefer A/B, keep both, keep neither, roles, add/replace, notes, helpful/dismiss).

**Assistant recommends. Coach explains. User decides.** No objective art
criticism, no scores-as-product, no forced winners, no silent portfolio changes,
no new network or third-party AI. Prior assistant signal-audit and owner-review
docs are preserved unchanged.

---

## Starting state / branch verification

```text
git fetch origin
git switch feature/scenes-portfolio-assistant
git pull --ff-only   # local tip already matched origin at 714d7ce
git switch -c feature/scenes-portfolio-coach
```

- Expected starting SHA **`714d7ce`** — confirmed.
- Working tree carried only operational noise (`data/publish-state.json`) — left
  uncommitted per playbook.
- Fetch briefly failed once (connection reset); local branch was already up to
  date with `origin/feature/scenes-portfolio-assistant` at the expected tip.

---

## Product principle honored

Calm photography mentor voice. Banned definitive language is absent and asserted
in tests (`objectively better`, `professional quality`, `correct composition`,
`should be rejected`, `score of N`, etc.). Creative points are labeled
**Creative (cautious)**; technical points cite metadata only. Roles never force
a single winner.

---

## Phase 1 — Signal audit

Full inventory: [`docs/scenes/portfolio-coach-signal-audit.md`](./portfolio-coach-signal-audit.md).

**Used:** favorites, Keep/Maybe/Reject, ratings, Photo Coach grades when analyzed,
capture timing, fingerprints, filename+size, aspect/orientation/resolution, tags
when present, media completeness, portfolio membership/order/cover/purpose
(keyword overlap only), assistant group membership.

**Excluded (honestly):** pixel sharpness/exposure/subject separation/background
distraction, perceptual hashing, GPS, shoot-store `styleSignals`, ML aesthetics,
Portfolio Health analytics — **the repo does not produce these for LibraryImage
comparisons**, so Coach does not claim them.

---

## What was built

| Capability | Behavior |
|------------|----------|
| Open from similar group | “Open Portfolio Coach” on group + pair buttons from related frames |
| Manual two-photo select | “Select for coach” (max 2) → open comparison |
| Nearby frame | Coach with previous/next in session order |
| Portfolio image vs alternative | When active frame is in a portfolio, offer vs related/alt candidate |
| Desktop layout | Side-by-side photographs; coaching/decide panes beside photos |
| Mobile layout | Photographs / Coaching / Your decision tabs (stacked workflow) |
| Frame comparison | Timing, resolution, aspect, duplicates, labels/ratings, soft coach, media, tags — only when present |
| Portfolio-fit | Membership, season/month overlap, fingerprint repetition, purpose keyword overlap, cover status, orientation variety, sequence orientation runs |
| Role comparison | Soft role hints; assign/override roles; never force a winner |
| Coaching structure | Observation → Why → Tradeoff → Portfolio context → Your call |
| Evidence | Per-point “Show evidence” with signal labels + A/B values |
| Confidence | Higher / Moderate / Lower (text + dots, never %) |
| User controls | Prefer A/B · keep both · keep neither · roles · add one/both · replace · helpful · dismiss · personal note · return to review |
| Personal notes | Local save; revisit from session; no gamification |
| Persistence | `waypoint-scenes-portfolio-coach-v1` — decisions survive regenerate |

**Route (unchanged host page):** `/apps/scenes/portfolio/assistant.html`
Coach panel: `#pfc-coach` within the Assistant workspace.

---

## Architecture (separated, testable without UI)

```
signal collection     apps/scenes/portfolio/js/assistant-signals.js   (reused)
  → comparison        apps/scenes/portfolio/js/coach-compare.js
  → coaching points   apps/scenes/portfolio/js/coach-generate.js      (ANALYSIS_VERSION 1.0.0)
  → uncertainty       (confidence + insufficient-evidence points in generate)
  → persistence       apps/scenes/portfolio/js/coach-store.js         (waypoint-scenes-portfolio-coach-v1)
  → presentation      apps/scenes/portfolio/js/assistant-ui.js + css
```

Conceptual `PortfolioCoachPoint`:
`category`, `observation`, `whyItMayMatter`, `tradeoff`, `portfolioContext`,
`decisionPrompt`, `confidence`, `evidence[]`, `kind` (technical|creative|mixed),
`mode` (frame|portfolio-fit|role), `analysisVersion`.

---

## Files added / changed

**Added:**
- `apps/scenes/portfolio/js/coach-compare.js`
- `apps/scenes/portfolio/js/coach-generate.js`
- `apps/scenes/portfolio/js/coach-store.js`
- `automation/test-scenes-portfolio-coach.mjs`
- `automation/capture-scenes-portfolio-coach.mjs`
- `docs/scenes/portfolio-coach-signal-audit.md`
- `docs/scenes/portfolio-coach-owner-review.md` (this file)
- `docs/scenes/portfolio-coach/*.png`

**Changed (Assistant host only):**
- `apps/scenes/portfolio/assistant.html` — coach region + script tags + copy
- `apps/scenes/portfolio/js/assistant-ui.js` — coach open/render/controls
- `apps/scenes/portfolio/css/scenes-portfolio-assistant.css` — coach layout
- `docs/ENGINEERING-PLAYBOOK.md` — Lessons Learned

**Preserved (not modified):**
- `docs/scenes/portfolio-assistant-signal-audit.md`
- `docs/scenes/portfolio-assistant-owner-review.md`
- Dashboard / Sheds product trees

---

## Tests

```bash
node automation/test-scenes-portfolio-coach.mjs        # 344 assertions — PASS
node automation/test-scenes-portfolio-assistant.mjs    # 94 — PASS (no regression)
node automation/test-scenes-portfolio.mjs              # 52 — PASS (foundation)
node automation/test-photo-library.mjs                 # 26 — PASS
node automation/test-photo-coach-shoot-review.mjs      # 41 — PASS
```

Coach coverage: compare facts, coaching structure, banned language, technical vs
creative, portfolio-fit / roles, edge states (no portfolio, single image,
identical signals, missing media), decisions + notes persistence across engines,
role override, invalid preference rejection, Assistant still independent,
interface/a11y surface, prior docs preserved.

### Headless page verification

`node automation/capture-scenes-portfolio-coach.mjs` (ports 8812/9442 in local run):
- **0 console errors**
- 10 candidate cells; coach pair + pick controls present
- Coach opens; **8** coaching points; evidence toggle works
- Prefer + personal note persist in UI
- Phone tabs (3) + photos panel; **no horizontal overflow** desktop or phone

---

## Screenshots

| File | View |
|------|------|
| `docs/scenes/portfolio-coach/01-desktop-assistant-start.png` | Desktop — start review |
| `docs/scenes/portfolio-coach/02-desktop-workspace-with-coach-entry.png` | Desktop — workspace with coach entry points |
| `docs/scenes/portfolio-coach/03-desktop-coach-photos.png` | Desktop — side-by-side photographs |
| `docs/scenes/portfolio-coach/04-desktop-coach-points.png` | Desktop — coaching points + photos |
| `docs/scenes/portfolio-coach/05-desktop-coach-evidence.png` | Desktop — evidence expanded |
| `docs/scenes/portfolio-coach/06-desktop-coach-decide.png` | Desktop — decisions, roles, notes |
| `docs/scenes/portfolio-coach/07-phone-coach-photos.png` | Phone — photographs tab |
| `docs/scenes/portfolio-coach/08-phone-coach-points.png` | Phone — coaching tab |

> Screenshots use SVG placeholder thumbnails seeded for review only. Production
> never seeds fake photographs.

---

## Accessibility & mobile

- Coach region labeled; tabs use `role="tab"` / `aria-selected`
- Evidence toggles expose `aria-expanded`
- Confidence via text + dots (never color alone)
- `:focus-visible` on coach tabs and note field
- `prefers-reduced-motion` includes coach surfaces
- `[hidden]` override for `#pfc-coach`
- Full coach workflow on phone via tabs; no h-overflow at 390px

---

## Privacy

- Local only. No new network calls, no third-party AI, no upload.
- Coach store holds ids + derived text + notes + decisions — never blobs.
- Originals never deleted/altered; portfolio membership changes only on explicit
  Add / Replace with confirmation for replace.

---

## Empty / edge states handled

One image · unrelated thin-metadata pairs · no portfolio · no group · missing
metadata · conflicting prior labels (via frame facts) · missing media · stale /
missing library refs · incomplete Photo Coach · already preferred · both/neither
in portfolio · identical signals · intentional-blur / unusual-exposure framed as
possibility when EXIF differs · large sessions (pair-scoped generation) ·
interrupted coach sessions (local reuse by assistant session + pair).

---

## Acceptance checklist (21)

1. [x] Comparative coach inside existing Portfolio Assistant experience  
2. [x] Open from similar-image group  
3. [x] Open from two manually selected photos  
4. [x] Open from candidate + nearby frame  
5. [x] Open from portfolio image + alternative  
6. [x] Desktop side-by-side; mobile stacked/tabs; photos dominant  
7. [x] Frame / portfolio-fit / role modes from real signals only  
8. [x] Coaching structure Observation → Why → Tradeoff → Portfolio → decision  
9. [x] Grounded categories only; insufficient-evidence first-class  
10. [x] Technical vs creative clearly distinguished  
11. [x] Evidence inspectable; weak evidence honest  
12. [x] Qualitative confidence Higher / Moderate / Lower (no fake %)  
13. [x] User controls: prefer / keep both / neither / roles / add / replace / helpful / dismiss / note / return  
14. [x] Never silently change portfolio; never delete/alter originals  
15. [x] Personal notes persist locally without gamification  
16. [x] Separated architecture; versioned; testable without UI  
17. [x] Portfolio-aware cover/sequence explainable context only (no Health / Auto Builder)  
18. [x] Edge states honest; manual comparison always available  
19. [x] Privacy local-only; performance non-blocking pair generation  
20. [x] Tests + regression (Assistant, Foundation, Library, Shoot Review) pass  
21. [x] Docs + screenshots; committed + pushed; **not merged · not deployed**; Dashboard/Sheds untouched  

---

## Regression check

| Suite | Result |
|-------|--------|
| Portfolio Coach | 344 PASS |
| Portfolio Assistant | 94 PASS |
| Portfolio Foundation | 52 PASS |
| Photo Library | 26 PASS |
| Shoot Review | 41 PASS |

Assistant capabilities (categories, similar groups, overrides, add-to-portfolio,
reanalyze-without-overwrite) remain functional. Diff scoped to Scenes portfolio
assistant/coach + docs/automation — **no Dashboard/Sheds product files**.

---

## Known limitations

- No pixel sharpness/exposure/subject-separation analysis (not on LibraryImage).
- Similarity remains metadata-based (fingerprint / name+size / burst / framing).
- Purpose alignment is weak keyword overlap only.
- Sequence tips never auto-reorder.
- Replace UX picks cover (or first other member) as the replaced id after confirm —
  not a full picker UI (explicit, reversible via portfolio editor).

---

## Deferred (explicitly not this sprint)

Auto Portfolio Builder · Portfolio Health · books · calendars · journals ·
Living Scenes · perceptual hashing · on-device EXIF enrichment · Dashboard/Sheds
changes · cloud sync · social share · lesson/quiz systems.

---

## Git / deploy confirmation

- Branch: `feature/scenes-portfolio-coach`
- Starting SHA: `714d7ce`
- Implementation commit: see `git log` for `feat(scenes): add comparative portfolio coaching`
- **Not merged** to `main` or assistant/foundation branches
- **Not deployed**
- Dashboard and Sheds product files were not modified
