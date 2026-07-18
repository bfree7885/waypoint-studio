# Cyber Timeline Explorer

**Status:** V0.1  
**Surface:** Intelligence Explorer → Timeline  
**Helpers:** `collectTimeline`, `filterTimeline` on `WDS.signalTerrainCyberExplorer`

---

## Event sources

1. Entities with `kind: timeline-event` (date in `externalIds.at` or `history[0].at`)  
2. Derived milestones from `history[]` on CVEs, patches, campaigns, advisories  

Event kinds (inferred for filtering, labeled in UI):

- Disclosure  
- Public advisory  
- Patch release  
- Known exploitation  
- Mitigation update  
- Additional affected products  
- Historical milestones  

---

## Filters

| Filter | Behavior |
|--------|----------|
| Vendor | Substring over title/summary |
| Severity | Entity severity label |
| Industry | Entity `industries[]` |
| Technology | Substring over title/summary |
| Region | Coarse `regions[]` (often `global`) |
| Time range | String compare on `at` (`YYYY` / `YYYY-MM-DD`) |

---

## Performance

Timeline rendering is **windowed** (`TIMELINE_PAGE = 12`) with “Load more” — a lightweight virtualization strategy appropriate for sample-scale data. Larger corpora should keep the same window API.
