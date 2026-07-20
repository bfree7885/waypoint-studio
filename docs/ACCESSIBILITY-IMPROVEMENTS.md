# Accessibility Improvements — RC2 Sprint 5

**Date:** 2026-07-20  
**Target direction:** WCAG 2.2 AA  
**Method:** Shared design-system fixes + axe-core smoke (`automation/a11y-smoke.mjs`) + manual code inspection.

## Fixed in this sprint

| Issue | Fix | Where |
|-------|-----|--------|
| Muted text failing contrast on navy | Raised `--wds-parchment-muted` / `--wds-parchment-dim` / `--wds-text-muted` | `wds-tokens.css` |
| Incomplete focus rings | Extended `:focus-visible` to skip links, shell, pills, forms, home cards | `wds-experience-v2.css`, app shell / contact |
| Small touch controls | 44px min on Knowledge filters/toggles, contact pills/footer, form controls | `wds-knowledge.css`, `wds-contact.css`, experience polish |
| iOS input zoom | Form / search inputs `font-size: max(1rem, 16px)` | experience + contact + search |
| Opaque errors | `errorHtml` adds provider status, recovery links (Contact/Support), `provider` kind | `wds-platform-ui.js` v2.1.0 |
| Status messages | Contact field errors keep `role="alert"`; form status uses alert vs status by kind | `wds-contact.js` (retained) |
| Layout landmarks | Existing skip links + `main#main` retained; sticky chrome safe-area | experience / app shell |

## Automated coverage

- **New:** `automation/a11y-smoke.mjs` — axe wcag2a/aa/2.1/2.2 tags on home, about, contact, support, knowledge, settings, dashboard, scenes, fieldry, foragecast.
- **Updated:** `automation/test-experience-system-v2.mjs` — asserts contrast token, overflow polish, provider error markup.

Serious/critical axe violations fail the smoke. Moderate/minor are reported but non-blocking.

## Remaining gaps (honest)

1. **Maps** — Leaflet controls / Sheds HUD still need a dedicated keyboard + SR pass.
2. **Charts / timelines** — Dashboard visuals need text equivalents where graphics-only.
3. **Nested interactive** — Photo Coach / Hidden Landscapes card-in-button patterns.
4. **Product themes** — Steepleaf light theme and SignalTerrain cyber surfaces still need a dedicated AA audit (token raise helps Studio chrome more than product-specific CSS).
5. **Dialogs** — No universal shared modal focus trap.
6. **Manual SR** — No VoiceOver / TalkBack / NVDA pass in this sprint.
7. **Knowledge cards** — Demo cards use light surfaces on dark shell; dark `prefers-color-scheme` rules exist but Studio forces dark tokens — residual eyebrow contrast may remain on some nodes.

## How to verify

```bash
cd audits/live-site-qa && npm install   # once, for axe-core
python3 -m http.server 8080             # repo root
node automation/a11y-smoke.mjs http://127.0.0.1:8080
```

Manual keyboard checklist:

1. Tab: Skip → Apps → local nav → primary CTA.
2. Contact: invalid submit focuses first `aria-invalid` field; status announces.
3. Home search: results list links are keyboard reachable.
4. Reduced motion: skeletons stop shimmering (`prefers-reduced-motion`).

## Baseline references

- Production axe frequency: `docs/RC1-ACCESSIBILITY-SUMMARY.md` (~102 color-contrast hits historically).
- Experience System V2 review: `docs/Accessibility-Review.md`.
