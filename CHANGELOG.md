# Changelog

All notable changes to Waypoint Scenes. Mission: **Observe. Understand. Create. Share.**

## [0.1.0] — MVP pre-release review (2026-05-30)

### Product & release
- Added `.ai-agents/MVP-RELEASE-CHECKLIST.md` with launch readiness score, remaining tasks, and milestone plan.
- Unified multi-agent pre-release review informing this ship candidate.

### Design — premium studio shell (`css/studio-shell.css`)
- **Why:** Interface should feel like intentional creative software, not a demo page.
- Segmented workspace tab control (Arc-inspired).
- Editorial hero compaction after upload.
- Lightroom-style preview stage with deeper shadows and borders.
- Typography and spacing scale (`--space-*` tokens).
- Skip-to-workspace link for keyboard users.
- Learn curriculum layout with step numbers and field-guide “Try this” callouts.
- Sidebar dimmed with message until a photograph is loaded.
- Coming Soon cards no longer look clickable on hover.

### Education (`js/learn-content.js`, `js/learn.js`)
- **Why:** Learn tab described features instead of teaching.
- 101 track: upload → preset → studio → parallax (4 lessons).
- 102 track: mode choice, analyzer, portfolio workflow, export (4 lessons).
- Naturalist tone — steps, not marketing bullets.
- Quick workspace links retained below curriculum.

### Engineering
- **`js/utils/file-upload.js`** — shared validation (JPG/PNG/WebP/SVG), blob revoke, input reset.
- **`js/utils/motion-preference.js`** — `prefers-reduced-motion` helper.
- **Upload fixes:** errors show in workspace banner + hero; file inputs reset after selection.
- **Image sync:** parallax-only upload now updates Living Scene (shared `imageUrl`).
- **Export:** `WaypointExport.downloadSnapshot()` + Download PNG button (was preview-only).
- **Tabs:** arrow key / Home / End navigation with roving `tabindex`.
- **Photography modal:** focus trap on Tab.
- **Parallax:** arrow-key exploration; spring inertia; reduced-motion path.
- Export canvas enlarged (640×400) for sharper downloads.
- File pickers accept SVG (matches portfolio workflow).

### Motion
- **Camera:** multi-keyframe handheld drift; slower default duration.
- **Fog:** longer, ease-in-out alternate drift (less mechanical).
- **Rain:** per-drop length/speed variance; subtle speed oscillation.
- **Snow:** gentle wobble accumulation and swirl.
- **Fireflies:** softer glow, velocity drift, calmer blink range.
- **Parallax:** velocity-based inertia layered on exponential easing.

### QA issues addressed
| Severity | Issue | Resolution |
|----------|-------|--------------|
| High | Export tab had no download | PNG snapshot button |
| High | Parallax/Living Scene image divergence | Bidirectional sync on parallax upload |
| High | Upload errors hidden below fold | Workspace error banner |
| High | Studio active without image | Sidebar `is-awaiting-image` |
| Medium | Tab keyboard a11y | `tabs.js` key handlers |
| Medium | Modal focus escape | Photography focus trap |
| Medium | File re-select same file | Input reset after load |
| Medium | Misleading parallax layer labels | “Preview layer” placeholders |
| Medium | Weak focus rings | `:focus-visible` on controls |
| Low | Sticky topbar scroll overlap | `scroll-margin-top` on workspace |
| Low | Coming Soon hover affordance | Neutralized hover style |

### Not in this release (by design)
- Video / Live Photo / wallpaper export (stubs remain).
- True parallax depth masking.
- Real `assets/Images/` portfolio replacements (SVG placeholders remain).

---

## Prior work (session history)

- Tabbed workspace: Living Scene, Interactive Parallax, Photography, Learn, Export.
- Interactive Parallax: presets, tilt, auto-drift, 3D card tilt.
- Photography: darkroom portfolio, masonry, modal, workflow buttons.
- Effects engine: modular fog/rain/snow/fireflies/etc. + Scene Presets + analyzer.
