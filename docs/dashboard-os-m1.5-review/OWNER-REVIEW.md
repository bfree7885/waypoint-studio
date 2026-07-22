# Dashboard Outdoor OS — Milestone 1.5 Owner Review

**Date:** 2026-07-22  
**Status:** STOP — **Milestone 1.5 complete; awaiting owner approval.**  
**Do not deploy. Do not merge. Do not begin Milestone 2.**  
**Authority:** Manifesto → Screen Specification → Architecture Reset  

---

## Verdict

Milestone 1.5 is a **presentation-only** pass: typography, hierarchy, spacing, readability, and subtle time-of-day presence. Information architecture, interaction model, panels, loading behavior, and content structure are unchanged.

The first viewport should now scan as a calm trailhead briefing — **Happening → What matters → Do this** — with Sources, Day arc, and Look closer subordinate.

---

## Screenshots

Folder: `docs/dashboard-os-m1.5-review/`

| Phase | Desktop first | Desktop scroll | Mobile first | Mobile scroll |
|-------|---------------|----------------|--------------|---------------|
| Before | [`before/01-desktop-first-viewport.png`](./before/01-desktop-first-viewport.png) | [`before/02-desktop-after-scroll.png`](./before/02-desktop-after-scroll.png) | [`before/03-mobile-first-viewport.png`](./before/03-mobile-first-viewport.png) | [`before/04-mobile-after-scroll.png`](./before/04-mobile-after-scroll.png) |
| After | [`after/01-desktop-first-viewport.png`](./after/01-desktop-first-viewport.png) | [`after/02-desktop-after-scroll.png`](./after/02-desktop-after-scroll.png) | [`after/03-mobile-first-viewport.png`](./after/03-mobile-first-viewport.png) | [`after/04-mobile-after-scroll.png`](./after/04-mobile-after-scroll.png) |

Capture script: `automation/capture-dashboard-os-m1.5-screenshots.mjs`  
Live server: `http://127.0.0.1:8799/apps/dashboard/` (Pike County seeded).  
Night capture window: briefing correctly uses tonight/tomorrow posture.

---

## Every visual refinement

| Change | Why |
|--------|-----|
| Stronger Happening headline scale + tighter tracking | Visual anchor for “what happened / how it feels” |
| Happening support quieter, longer line-height, capped measure | Scan support line; don’t compete with headline |
| Shorter night support copy | Fewer words; still says tonight vs tomorrow |
| Larger section gaps (`~26–40px`) | Spec §1.5 whitespace; breathe between Happening / Matters / Do |
| Reading column max ~42rem; text measure ~36rem | Avoid ultrawide stretch; desktop reading rhythm |
| “Do this” left accent rail (2px accent, not a CTA pill) | Agency without marketing chrome; co-equal with Happening |
| Do primary heavier; alternate quieter | One primary action; alternate recedes |
| Matters #1 heavier; #2–3 smaller/quieter | Ranked meaning, not equal list |
| Section labels smaller, wider tracking, fainter | Labels orient; content speaks |
| Place · time / Outside chrome / Place·Prefs quieter | Spec §1.3 [B]/[C] — chrome subordinate |
| Day arc compact times (`2p` not `2:00 PM`) | Spec §1.3 [H] scan beats |
| Day arc slightly dimmed vs primary stack | Secondary confirmation, not second dashboard |
| Gateways: no default underline; hover border only | Look closer recedes; less “webpage link row” |
| Sources cue smaller, letter-spaced | Trust visible, never hero |
| After-scroll softer separation + quieter type | Depth after decision; not a second home |
| Layered atmosphere gradients (day + night) | Felt place; Spec [G] atmosphere field |
| Night: body/shell follow Outside field | One composition edge-to-edge, not a boxed panel |
| Night accent slightly brighter for best-window beat | Readable contrast on dark atmosphere |
| Quiet shell brand + footer further reduced | Studio chrome stays below briefing |
| Font smoothing + Inter feature settings | Micro-typography polish |
| Panel sheet padding / title tracking micro-tuned | Detail sheets match Outside calm |

---

## Typography improvements

- **Happening:** Cormorant remains dominant; size up to ~2.65rem desktop; `max-width: 18–20ch` so the character line doesn’t sprawl.
- **Support:** ~1.02rem / 1.5 line-height / quiet ink — readable at arm’s length without rivaling the headline.
- **Do primary:** ~1.15–1.4rem, weight 600, slight negative tracking — decision line.
- **Matters primary vs secondary:** clear weight/size split when 2–3 items appear.
- **Labels:** ~11px, `0.11em` tracking, uppercase, faint — field-guide section markers.
- **Day arc / Sources / Prefs:** caption scale; Sources faintest on the fold.

---

## Hierarchy improvements

Intended eye path (unchanged IA, clearer weight):

1. Place · time (quiet locate)  
2. **Happening** (largest)  
3. **What matters #1**  
4. **Do this** (accent rail + weight)  
5. Day arc / Sources (recede)  
6. After-scroll Notice · Look closer · Prefs (confirmation only)

Functional color still limited to: alert severity (when present) + Do accent / best-window whisper.

---

## Spacing improvements

- Composition gap token raised: `clamp(1.65rem, 4vw, 2.5rem)` (desktop higher).
- Sheet horizontal padding uses fluid clamp; desktop top/bottom padding increased.
- Do block gains left padding for the accent rail without becoming a card.
- After-scroll: more top padding and clearer gap from the primary stack.
- Mobile: slightly tighter but still Spec-range section gaps; Do rail slightly narrower.

---

## Readability improvements

- Night support shortened for scanability (structure unchanged).
- Day-arc times compacted to Spec-like `2p` form.
- Line length capped on Happening support and Do.
- Contrast: primary ink stronger vs quiet/faint layers; night accent nudged for best-window readability.
- Gateways lose default underlines (less visual noise when scanning).
- After-scroll content opacity/color slightly reduced so the decision stack stays primary.

---

## Intentionally left for Milestone 2

- Motion / ambient atmosphere animation (locked out of M1.5).
- Hero photography or real sky imagery.
- Any IA / panel / ranking / engine changes.
- Day-arc beat *content* quality (e.g. “overcast Best photography window” wording) — engine/timeline polish, not CSS.
- Further quieting of Studio footer utility link density (global shell; out of Outside composition).
- Daytime (non-night) owner visual review — this capture set is a night briefing.
- Performance / boot-graph reduction (Architecture Phase 5).
- Deploy / merge / production cutover.

---

## Files touched

| Path | Role |
|------|------|
| `design-system/css/wds-dashboard-os.css` | Primary M1.5 refinements |
| `design-system/js/dashboard/os/wds-dashboard-os-compose.js` | Night support shorten; day-arc time compacting |
| `apps/dashboard/index.html` | CSS cache-bust `os-m1.5-2` |
| `automation/capture-dashboard-os-m1.5-screenshots.mjs` | Before/after capture |
| `docs/dashboard-os-m1.5-review/**` | Screenshots + this review |

**Not changed:** section order, panels, navigation, loading behavior, engines, OIP.

---

## Tests

| Suite | Result |
|-------|--------|
| `node automation/test-dashboard-v2.mjs` | **21 passed, 0 failed** |
| `node automation/test-dashboard-today-outside.mjs` | **All passed** |
| `node automation/test-dashboard-reliability.mjs` | **41 passed** |

---

## Owner ask

Please review before/after screenshots and confirm whether M1.5 readability/hierarchy/presence is approved to lock, or list specific visual adjustments before Milestone 2.

**Milestone 1.5 is awaiting owner approval.**
