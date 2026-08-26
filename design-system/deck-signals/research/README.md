# SignalTerrain Research Workspace

**Version:** 0.1.0 · **Status:** Architecture + local-first runtime  
**Path:** `design-system/signalterrain/research/`  
**Runtime:** `design-system/js/signalterrain/wds-signalterrain-research.js` → `WDS.signalTerrainResearch`

Shared bookmarks, collections, notes, saved searches, tags, cross-references, source library, timeline pins, reading queue, **investigations**, **watchlists**, and **activity** for **Radio & Spectrum** and **Cyber Awareness**.

Do not implement separate RF-only and Cyber-only workspace stacks.

Persistence: on-device `localStorage` (`st_research_workspace_v01`), seeded from sample JSON when present. Cyber Operations Workspace layout prefs use `st_cyber_workspace_layout_v01` (chrome only).

See CYBER-WORKSPACE.md, CYBER-INTELLIGENCE-MODEL.md, and CYBER-EXPLORER.md.
