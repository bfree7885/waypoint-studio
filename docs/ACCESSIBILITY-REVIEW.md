# SignalTerrain — Accessibility Review (Work Block 8)

**Date:** 2026-07-18  
**Scope:** Cyber MPA surfaces + foundation patterns  
**Method:** Code/structure review (not a full WCAG audit lab)

---

## Strengths already present

- Skip link (`.wds-skip`) on cyber pages  
- `lang="en"`, descriptive `<title>` / meta descriptions  
- `aria-busy` on mounts during load  
- `role="alert"` / `role="status"` in several error/idle paths  
- Noscript fallbacks with meaningful copy  
- Restrained color bands (not red-flash alert chrome)

---

## Findings

### A1 — Focus management on hash-driven paints

| Item | Detail |
|------|--------|
| **Findings** | Panel routers replace large DOM trees without moving focus to the new heading or announcing the change. |
| **Evidence** | Explorer/knowledge `innerHTML` on `hashchange`. |
| **Recommendations** | After paint: focus `h1`/`h2` of panel (`tabindex="-1"`); optional `aria-live="polite"` status. |
| **Priority** | High |
| **Estimated effort** | 1–2 days |
| **Expected impact** | Screen reader / keyboard usability |

### A2 — Keyboard navigation completeness

| Item | Detail |
|------|--------|
| **Findings** | Links/buttons are mostly native. Custom chips/filters may lack clear `aria-pressed` / roving tabindex. |
| **Evidence** | Filter chips (`.st-chip`, `.st-filter`) patterns. |
| **Recommendations** | Use native `button` with `aria-pressed`; ensure Enter/Space; visible `:focus-visible` using `--st-focus`. |
| **Priority** | High |
| **Estimated effort** | 1 day |
| **Expected impact** | Keyboard parity |

### A3 — Color contrast & theme

| Item | Detail |
|------|--------|
| **Findings** | Muted text on warm background may sit near WCAG AA edge for small type; no high-contrast or dark-mode product theme for cyber. |
| **Evidence** | `--st-muted` on `--st-bg`; Google Inter/Cormorant. |
| **Recommendations** | Contrast check for `.st-lead`, citations, band labels; add `prefers-contrast` tweaks; defer dark mode unless Studio-wide. |
| **Priority** | Medium |
| **Estimated effort** | 1 day |
| **Expected impact** | Readable secondary text |

### A4 — Reduced motion

| Item | Detail |
|------|--------|
| **Findings** | Limited motion today (good). Future map/graph animations need `prefers-reduced-motion`. |
| **Evidence** | Foundation CSS motion not cyber-specific. |
| **Recommendations** | Gate any transitions; document motion budget. |
| **Priority** | Medium |
| **Estimated effort** | 0.5 day |
| **Expected impact** | Vestibular safety |

### A5 — Touch & responsive

| Item | Detail |
|------|--------|
| **Findings** | Layouts mostly linear/max-width — mobile-friendly. Dense filter rows and graph lists may be tight on small screens. |
| **Evidence** | Explorer filters; knowledge nav wrap. |
| **Recommendations** | Ensure 44px targets; stack filters; avoid horizontal drag-only map UX. |
| **Priority** | Medium |
| **Estimated effort** | 1 day |
| **Expected impact** | Mobile usability |

### A6 — Font scaling

| Item | Detail |
|------|--------|
| **Findings** | Relative units mostly used; clamp on some titles. Absolute px remnants in places. |
| **Evidence** | Mixed `rem`/`px` in page styles. |
| **Recommendations** | Prefer `rem`; test 200% zoom on Brief and Advisor. |
| **Priority** | Medium |
| **Estimated effort** | 0.5–1 d |
| **Expected impact** | Low-vision support |

### A7 — Screen reader semantics for graphs/maps

| Item | Detail |
|------|--------|
| **Findings** | Visual graph/map lack equivalent text tables or summaries beyond adjacent copy. |
| **Evidence** | Explorer map/graph panels. |
| **Recommendations** | Always pair with entity list + relationship sentences; `aria-describedby` to explanation. |
| **Priority** | High |
| **Estimated effort** | 1–2 days |
| **Expected impact** | Non-visual comprehension |

### A8 — Automated coverage gap

| Item | Detail |
|------|--------|
| **Findings** | No axe/playwright a11y assertions in automation. |
| **Evidence** | Contract smoke tests only. |
| **Recommendations** | Add one axe smoke on Brief + Explorer after paint. |
| **Priority** | Medium |
| **Estimated effort** | 1–2 days |
| **Expected impact** | Regression safety |

---

## Dark mode / high contrast

| Mode | Status | Recommendation |
|------|--------|----------------|
| Dark mode | Not a cyber product requirement today | Follow Studio-wide tokens later; do not invent a purple dark theme |
| High contrast | Unsupported | Add `prefers-contrast: more` border/text boosts |
| Forced colors | Untested | Verify Windows HC mode on links/buttons |

---

## Implementation order

1. Focus + live region on panel change  
2. Chip/filter `aria-pressed`  
3. Graph/map text equivalents  
4. Contrast pass on muted text  
5. `prefers-reduced-motion` gates  
6. Automated axe smoke  

Related: [UX-REVIEW.md](UX-REVIEW.md), [PLATFORM-HARDENING.md](PLATFORM-HARDENING.md).
