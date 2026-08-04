# Dashboard legacy modules — not loaded on production Home

These directories remain in Git for history and reference. They are **not**
registered by `design-system/js/wds-home.js` (canonical Home / `/apps/dashboard/`
loader) as of Turnaround Sprint 4 (2026-07-26).

| Path | Era | Status |
| --- | --- | --- |
| `dashboard/os/` | Outdoor OS | Unloaded |
| `dashboard/v2/` | Dashboard V2 | Unloaded |
| `dashboard/v3/` | Dashboard V3 | Unloaded |
| `dashboard/wds-dashboard-recovery.js` | Recovery | Unloaded |
| `wds-dashboard.js` + `dashboard/wds-dashboard-*.js` (V1 widgets/catalog/story/…) | V1 | Unloaded |
| `dashboard/wds-dashboard-engine.js` | Legacy engine | Unloaded |
| `wds-content-engine.js` | Content-engine mount | Unloaded on Home (OIP uses JSON fetch via `contentEngineBase` only when present) |
| `wds-happening-now.js` | Legacy briefing | Unloaded |
| `outdoor-intelligence/wds-oie-*.js` (brief/rules engines) | OIE | Unloaded on Home; OIP service path is used instead |

**Canonical runtime:** `dashboard/rebuild/*` via `wds-home.js` + `apps/dashboard/js/home-boot.js`.

---

**Platform consolidation (2026-08-03):** These legacy trees remain in Git for history and
isolated era tests. They stay **unloaded** on production Home. Do not delete without an
owner decision — removal is separate from loader consolidation.

