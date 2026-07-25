# Scenes Portfolio Website Output — Owner Review

**Date:** 2026-07-25  
**Branch:** `feature/scenes-portfolio-website-output`  
**Cut from:** `feature/scenes-portfolio-health`  
**Starting SHA:** `6a38dbb72bebe95584cc531f23af13caa07c8d78` (matches brief expectation)  
**Implementation commit:** _(filled after commit)_  
**Final / tip SHA:** _(filled after push)_  
**Base health tip:** `6a38dbb` · **Base builder:** `09a2146` · **Base coach:** `ef7ed25` · **Base assistant:** `5780d05` · **Base foundation:** `4f8d18c`  
**Deployment status:** **Not deployed** · **Not merged**  
**Dashboard / Sheds:** **Untouched**

Prior Foundation / Assistant / Coach / Builder / Health owner-review and signal/readiness audits are preserved unchanged.

---

## Executive summary

This sprint adds the first real **Portfolio Website Output** workflow: turn an
approved purpose portfolio into a reopenable website gallery draft, preview it
honestly across simulated viewports, and export a portable static `.zip` with
local HTML/CSS/JS and image derivatives. There is **no Publish button**, no
hosting, no analytics, no external AI, and no silent mutation of the source
portfolio.

Three complete layouts ship: **Editorial sequence**, **Clean grid**, and
**Full-width showcase**. Metadata is private by default (including precise GPS).
Public captions are never prefilled from private Scenes notes or Assistant /
Coach / Health analysis.

---

## Readiness audit summary

Full inventory: [`docs/scenes/portfolio-website-output-readiness-audit.md`](./portfolio-website-output-readiness-audit.md).

**Available:** portfolio title/description/purpose/order/cover; library thumbs +
optional originals; per-item private notes/rationales (not for public export);
Builder/Coach/Health as soft priors only.

**Missing before sprint:** ZIP writer, website project model, layouts, alt
workflow, reconciliation, export validation, portable package CSS.

**Honest limits:** thumbs ≈ 320px when originals absent; browser memory for
large originals; viewport preview is CSS width simulation, not a real device.

---

## Exact sprint scope

**In:** `output.html` workspace, durable `PortfolioWebsiteProject`, three
layouts, privacy-safe metadata, preview, ZIP export, history metadata, tests,
screenshots, sample export, readiness audit + this owner review.

**Out:** auto-publish, hosting, commerce, print/calendar/book/journals, Living
Scenes, Dashboard, Sheds, external AI, fabricated captions/alt, page builder.

---

## User-visible workflow

1. From Portfolios toolbar or editor → **Create website gallery** (`output.html`).
2. Choose a saved portfolio + starting layout → create draft.
3. Edit gallery title/description, layout, metadata visibility, appearance.
4. Per image: public title/caption/alt, decorative flag, hide, set cover.
5. Review validation (blocking / warning / info).
6. **Preview** with desktop/tablet/mobile width simulation → return to editing.
7. **Export ZIP** (cancel supported) → download portable package.
8. Reopen / rename / duplicate / delete (confirm) / reconcile source changes.

Deep link: `output.html?portfolio=<id>` starts or reopens a draft for that set.

---

## Content / project model

`PortfolioWebsiteProject` (`output-models.js`): id, portfolioId, title,
description, layout, imageIds, coverImageId, metadataVisibility, imageContent
(title/caption/altText/altDecorative/hidden), appearance, sourceSnapshot,
lastExport, exportVersion, missingFileIds, createdAt/updatedAt.

Persisted in `waypoint-scenes-portfolio-website-projects-v1`. Export history in
`waypoint-scenes-portfolio-website-export-history-v1` (metadata only — no ZIP
blobs retained).

Source portfolio order is the starting authority; output edits do not write
back to the portfolio.

---

## Layouts shipped

| Layout | Behavior |
|--------|----------|
| Editorial sequence | Vertical sequence, opening/cover/closing role hints, captions |
| Clean grid | Responsive grid + focused viewer |
| Full-width showcase | Large images, minimal chrome, cover hero |

No placeholder layouts.

---

## Editing model (focused)

Allowed: gallery title/description; image title/caption/alt; hide in this
output; cover; metadata display toggles; restrained appearance (theme, spacing,
density, fit, captions, title align, cover display, max width).

Not allowed: page builder, arbitrary HTML/scripts, embeds, tracking, social,
comments, likes, followers.

---

## Caption + alt-text workflow

- Public captions start empty — never prefilled from private notes, Assistant,
  Coach, Health, or `selectionRationale`.
- Optional “Copy description → caption” uses **user-authored** gallery/image
  title/description only.
- Alt text: manual write, incomplete OK in draft, warn before export; decorative
  uses `alt=""`.
- No fabricated visual descriptions.

---

## Metadata privacy

**Default off:** capture date, broad location, precise GPS, camera, lens, focal
length.

**Always excluded:** precise GPS unless explicitly enabled (with warning),
filenames, paths, internal ids in public copy, private notes, Assistant/Coach/
Health internals, import ledger.

If precise GPS is enabled, export includes a clear warning string and marks
`locationKind: embedded-gps`.

---

## Appearance

Dark (charcoal/slate) or light (off-white) themes using Scenes aurora accents.
Exported CSS is self-contained (system/Georgia stack — no Google Fonts CDN).

---

## Preview model

Live HTML built from the same package generators as export, with thumbnail data
URLs inlined for the iframe. Viewport buttons set CSS widths (desktop / 768 /
390). Documented as simulation, not a device lab.

Focused viewer in exported site: next/prev/close, caption, optional meta,
keyboard (Esc/arrows), focus return, reduced-motion CSS. Gallery remains
browsable without JS via plain links/images.

---

## Export package

Real STORED `.zip` (no third-party ZIP library / no CDN):

- `index.html`, `styles.css`, `gallery.js`, `README.txt`, `images/*`
- Optimized derivatives: originals when IndexedDB has them, else library
  thumbnails (honest preview quality)
- Safe sequential/sanitized names; collision suffixes
- No analytics, remote fonts, remote APIs, source maps, or absolute paths

Usable via `file://` or any static server. **No hosting this sprint.**

---

## Image export limitations

| Case | Behavior |
|------|----------|
| Thumbnail only | Exported as web preview derivative |
| Original in IndexedDB | Preferred when available |
| Missing library ref | Blocking validation |
| No media bytes | Warning / missing placeholder |
| RAW / camera-card paths | Not supported (browser library only) |

---

## Validation

| Severity | Examples |
|----------|----------|
| Blocking | Blank title, no visible images, missing files, hidden/unavailable cover, oversized package |
| Warning | Default/empty title, missing alt, unsupported media, precise GPS enabled, many images, large size |
| Info | Optional captions incomplete |

Optional captions never block. Broken/unsafe packages do.

---

## Persistence + reconciliation

Create / save / reopen / rename / duplicate / delete (confirm) / refresh missing
/ change applied via reconcile.

When source changes: detect added/removed/reordered/cover/title/description/
purpose. **Apply all** (preserves surviving imageContent) or **Keep current**
(updates snapshot only). Never silently discard output edits.

---

## Export history

Lightweight entries: projectId, timestamp, version, filename, image count,
approx bytes, warnings, success/failure. ZIPs are not retained in app storage.

---

## Empty / edge states

Handled: no portfolios, empty portfolio, missing images, hidden cover, no
projects yet, cancel export, oversized guidance, reconciliation banner,
validation lists, decorative alt, XSS-safe text.

---

## Performance notes

- Progress UI during export; cancel via `cancelRef`
- Soft guidance at 80 images / ~40MB warn / ~180MB block
- STORED ZIP avoids compression CPU; JPEGs already compressed
- Preview uses existing thumbnails (no full-res decode required)

---

## Privacy / security verification

Sample export inspected (`docs/scenes/portfolio-website-output/sample-export/`):

- No `PRIVATE` notes, photographer notes, or filenames like `IMG_001`
- No precise GPS digits
- No `googleapis` / `http(s)` / analytics / gtag
- No Publish control in workspace or export
- HTML escaped for script/attribute injection
- ZIP paths reject `..`

---

## Accessibility

Editor + export: skip link, landmarks, headings, keyboard viewer controls,
focus return, alt workflow, reduced-motion rules, contrast on dark/light themes,
validation via `aria-live`, preview iframe titled. Exported gallery usable
without JS via linked images.

---

## Screenshots

Under [`docs/scenes/portfolio-website-output/`](./portfolio-website-output/):

| File | Content |
|------|---------|
| `01-desktop-home.png` | Empty projects home |
| `02-desktop-create.png` | Portfolio picker |
| `03-desktop-editor.png` | Editor |
| `04-desktop-editor-captions.png` | Caption/alt editing |
| `05-desktop-preview.png` | Desktop preview |
| `06-tablet-editor.png` | Tablet editor |
| `07-tablet-preview.png` | Tablet preview |
| `08-phone-editor.png` | Phone editor |
| `09-phone-preview.png` | Phone preview |
| `10-desktop-portfolio-link.png` | Portfolios toolbar link |

Sample artifact: `sample-autumn-ridges-website.zip` + unpacked `sample-export/`.

---

## Tests

| Suite | Result |
|-------|--------|
| `automation/test-scenes-portfolio-website-output.mjs` | **78 passed** |
| Foundation | 52 passed |
| Assistant | 94 passed |
| Coach | 344 passed |
| Builder | 114 passed |
| Health | 96 passed |
| Photo Library | 26 passed |
| Shoot Review | 41 passed |

Capture: `automation/capture-scenes-portfolio-website-output.mjs` — 10 PNGs, 0 console errors, no phone overflow.

---

## Acceptance criteria checklist (31)

1. Accessible from saved portfolio — **yes** (toolbar + editor + `?portfolio=`)
2. Choose portfolio — **yes**
3. Review missing images — **yes**
4. Choose layout (2+ complete) — **yes** (3)
5. Choose metadata display — **yes**
6. Edit title/description — **yes**
7. Preview desktop/tablet/mobile — **yes**
8. Focused appearance options — **yes**
9. Export portable static ZIP — **yes**
10. Reopen later — **yes**
11. No fake Publish — **yes**
12. Honor order — **yes**
13. Preserve user decisions / no silent source mutation — **yes**
14. Present photos in complete layouts — **yes**
15. Simple/calm limited customization — **yes**
16. Reliable preview from real settings — **yes**
17. Portable local/static-server output — **yes**
18. No auto-publish / third-party host — **yes**
19. No alter originals — **yes**
20. No replace portfolio — **yes**
21. No rewrite captions without approval / no private prefill — **yes**
22. No fabricated content — **yes**
23. Private metadata default — **yes**
24. No external AI required — **yes**
25. No dead export controls — **yes**
26. Alt workflow + export warn — **yes**
27. Validation blocking/warning/info — **yes**
28. Reconciliation without silent discard — **yes**
29. Export history lightweight — **yes**
30. A11y landmarks/keyboard/alt/reduced motion — **yes**
31. Security: sanitize, no path traversal, no CDN in export — **yes**

---

## Known limitations / risks

- Thumbnail-sized exports when originals are absent (labeled by derivative kind
  in package assembly; README states draft/portable nature).
- Browser memory can still fail on very large original sets — soft/hard size
  guidance + cancel.
- Viewport preview is not a real device lab.
- Structured Builder roles are not first-class on saved portfolios; editorial
  role labels use cover/opening/closing + rationale keywords from
  `selectionRationale` when present.
- Workspace shell still loads Google Fonts for the *Scenes app chrome*; exported
  packages do not.

---

## Recommendations (next)

1. Optional print-output project sharing the same public caption/alt model.
2. Stronger original-preferring re-encode (max edge) when originals are huge.
3. Manual static-host upload checklist (still no auto-publish).
4. Persist structured roles on portfolio items if editorial roles become primary.

---

## Diff scope confirmation

Touches: `apps/scenes/portfolio/**` (output workspace + portfolio link),
`automation/*website-output*`, `automation/smoke-browser.mjs` route,
`docs/scenes/portfolio-website-output*`.

**Dashboard / Sheds product files:** untouched.  
**Operational noise** (`data/publish-state.json`, etc.): left uncommitted.

---

## Git / merge / deploy

| Item | Status |
|------|--------|
| Branch | `feature/scenes-portfolio-website-output` |
| Merge to main | **Not merged** |
| Deploy | **Not deployed** |
| Push | _(filled after push)_ |
