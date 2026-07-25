# Portfolio Website Output — Readiness Audit

**Date:** 2026-07-25  
**Branch:** `feature/scenes-portfolio-website-output`  
**Cut from:** `feature/scenes-portfolio-health` @ `6a38dbb72bebe95584cc531f23af13caa07c8d78`  
**Scope:** Honest inventory of what exists before building the first portable website gallery draft.  
**Status:** Audit only — does not claim unimplemented export/publish capabilities.

Prior Foundation / Assistant / Coach / Builder / Health owner-review and signal-audit docs are preserved unchanged.

---

## 1. Available content and variants

| Source | Available | Notes |
|--------|-----------|-------|
| Portfolio title | Yes | `portfolio.title` |
| Portfolio description | Yes | `portfolio.description` (may be null) |
| Portfolio purpose | Yes | Free-text; Builder maps soft purpose ids |
| Private portfolio notes | Yes | `portfolio.notes` — **private; never export by default** |
| Ordered image ids | Yes | `portfolio.imageIds` authoritative order |
| Cover image id | Yes | `portfolio.coverImageId` |
| Per-item notes | Yes | `items[].notes` — private |
| Selection rationale | Yes | Often Builder/Assistant text — **internal; not public caption** |
| Structured roles | Partial | Builder draft roles in session store; saved portfolios usually encode role language only in `selectionRationale` |
| Assistant sessions | Yes | Candidates/groups — **analysis; not gallery content** |
| Coach decisions/notes | Yes | Pair mentoring — **private** |
| Builder drafts | Yes | Roles/sequence/explanations — soft prior only |
| Health insights | Yes | Reflective — **private; never export** |
| Favorites / Keep / rating | Yes | Library decisions — not public gallery fields |
| User-authored tags / subjectHints | When present | Optional public only if product later opts in; **excluded by default this sprint** |

**Variants:** No alternate portfolio “website drafts” exist yet. This sprint introduces `PortfolioWebsiteProject` as a separate durable output project.

---

## 2. Available metadata (library)

From `LibraryImage` (`apps/photo-library/js/pl-models.js`):

| Field | Present when | Export default |
|-------|--------------|----------------|
| `captureDate` | Import/EXIF when available | Opt-in |
| `camera.make/model` | When present | Opt-in |
| `camera.lens` | When present | Opt-in |
| `camera.focalLengthMm` | When present | Opt-in |
| `gps.lat/lon` | When present | **Never by default**; precise requires explicit opt-in + warning |
| `orientation` / `width` / `height` / `aspectRatio` | When present | Used for layout; not dumped as private EXIF |
| `filename` / `originalFilename` | Always | **Excluded** from public package |
| `photographerNotes` | When present | **Private** unless user copies into public caption |
| `aiNotes` | When present | **Private / never fabricate captions from** |
| Module refs (Photo Coach scores, etc.) | Soft | **Never export** |

Honest gap: many frames lack EXIF/GPS/camera; UI must not invent values.

---

## 3. Private metadata (must not leak)

Exclude from exported static sites by default:

- Precise GPS coordinates
- Original filenames and filesystem paths
- Internal portfolio / library / session ids (avoid in public HTML where possible; use sequential image names)
- Private portfolio notes and per-item private notes
- Assistant confidence, Coach evidence, Health insights
- Camera serials (not modeled today; still treat unknown EXIF as private)
- Import ledger / IndexedDB keys
- `selectionRationale` and Builder/Coach internal analysis text
- Source maps, absolute paths, workspace roots

---

## 4. Supported export formats (pre-sprint)

| Format | Status |
|--------|--------|
| Portfolio JSON in localStorage | Exists (ids only, no blobs) |
| Website gallery ZIP | **Does not exist** — this sprint |
| Print PDF / book / calendar | Out of scope |
| Cloud publish / hosting | Explicitly out of scope |
| Video / live photos / wallpapers | Stubs in `apps/waypoint-scenes/js/export.js` only |

Reusable download pattern: blob URL + `<a download>` (e.g. Fieldry `downloadBlob`, WaypointExport `downloadSnapshot`).

---

## 5. Static-build capabilities

| Capability | Status |
|------------|--------|
| Repo static file serving | Local HTTP / static hosting of app pages |
| Offline ZIP assembly | **None** — no JSZip/fflate/vendor ZIP today |
| Bundler for gallery packages | **None** — generate HTML/CSS/JS strings in-browser |
| CDN fonts in app shell | Google Fonts used in portfolio workspace HTML — **must not be required** in exported package |
| Third-party gallery runtime | WDS gallery exists for demos; exported site should be self-contained |

---

## 6. Reusable components

| Asset | Path | Reuse |
|-------|------|-------|
| Portfolio engine/store/models | `apps/scenes/portfolio/js/portfolio-*.js` | Source of truth for portfolios |
| Photo Library store/engine | `apps/photo-library/js/pl-*.js` | Index + IndexedDB originals |
| Thumb rendering pattern | `portfolio-ui.js` `thumbHtml` | Preview in editor |
| Download trigger | Fieldry / WaypointExport patterns | ZIP download |
| WDS gallery | `design-system/js/wds-gallery.js` | Optional inspiration only; not a dependency for export |
| Scenes color tokens | `scenes-home.css` / `scenes-portfolio.css` | Charcoal/slate/off-white/aurora for exported CSS |
| Workspace shell pattern | health/builder HTML + boot | New `output.html` workspace |

---

## 7. Missing dependencies (honest)

- ZIP writer (no vendor library in repo) → implement minimal STORED ZIP (no CDN)
- Durable website-project model/store
- Layout HTML/CSS generators
- Focused image viewer for preview + export
- Alt-text workflow and export validation
- Source↔output reconciliation UI
- Export history (lightweight metadata only)
- Portable system-font stack for export (no Google Fonts requirement)

---

## 8. Image-processing limitations

| Reality | Implication |
|---------|-------------|
| Thumbnails ≈ 320px JPEG data URLs in localStorage | Default web derivatives are preview-sized unless originals are available |
| Originals in IndexedDB when imported | Prefer originals when present; fall back to thumbnail honestly |
| Migrated Coach rows may lack originals | Mark as preview-quality / missing original |
| No RAW pipeline | Skip unsupported; do not invent pixels |
| No perceptual re-encode pipeline beyond canvas thumbs | Export may reuse JPEG bytes; optional canvas resize when original is huge |
| Camera-card / absolute FS paths | Never available in browser — only library ids + blobs |

---

## 9. Browser / filesystem constraints

- No Node filesystem from the browser; export is in-memory ZIP download.
- IndexedDB + localStorage quotas can fail on large originals — validate size estimate; allow cancel where practical.
- Headless/automation must seed library thumbs (existing capture pattern).
- Preview viewport switch is CSS width simulation, not a real device — document honestly.
- Opening exported ZIP requires user unzip + `file://` or a static server; some browsers restrict `file://` modules — keep exported JS optional/progressive.

---

## 10. Security / privacy / performance risks

| Risk | Mitigation |
|------|------------|
| XSS via titles/captions | Escape all user text in generated HTML |
| Path traversal in ZIP names | Sanitize to safe relative names; reject `..` |
| Private note leakage | Separate public caption fields; never prefill from private notes/analysis |
| Precise GPS leakage | Default off; warn on precise opt-in |
| Memory pressure building ZIP | Cap image count/size estimate; progress; prefer derivatives |
| External network in export | Zero — local CSS/JS/images only |
| Fake Publish | Do not ship a Publish control |

---

## 11. Selected vs excluded content for this sprint

**Selected for website gallery drafts:**

- Portfolio title/description (editable on output without mutating source)
- Ordered visible images + cover
- User-authored public image title/caption/alt
- Opt-in non-precise metadata
- Two–three complete layouts (editorial, clean grid; showcase if complete)
- Local preview + ZIP export + reopenable projects

**Excluded:**

- Auto-publish / hosting / analytics / tracking / social
- Prefilling public captions from Assistant/Coach/Health/private notes
- Fabricated alt text or visual descriptions
- Page builder, arbitrary HTML/scripts, embeds
- Print/calendar/book/journal pipelines
- Dashboard / Sheds changes
- Living Scenes

---

## 12. Future print-output extension points

Without implementing print now, keep these seams:

- Shared `PortfolioWebsiteProject`-like output project model (layout → print template later)
- Ordered image list + cover + public captions/alt already separated from private notes
- Validation pipeline (blocking vs warning) reusable for print completeness
- Image derivative resolver (web vs print resolution tiers later)
- Export history records (format field can later include `print-pdf`)
- Appearance tokens that do not hard-code “website only” assumptions in the data model

Do **not** invent print capabilities in this sprint.

---

## Audit conclusion

Foundation through Health provide durable portfolios, library media, and coaching layers. **No website gallery output, ZIP package, or publish path exists yet.** This sprint can build a trustworthy local draft → preview → portable static ZIP workflow on top of real portfolio content, with privacy defaults and honest image-quality labeling.
