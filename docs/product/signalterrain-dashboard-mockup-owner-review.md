# Owner Review — SignalTerrain dashboard mockup

**Date:** 2026-08-06  
**Branch:** `feature/signalterrain-dashboard-mockup`  
**Base:** `feature/signalterrain-landing` (`1ed2203`)  
**Product:** SignalTerrain  
**Deployed:** No  
**Merged:** No  
**Implementation:** None (static mockup only)

---

## Verdict

**Approve the SignalTerrain dashboard mockup for visual / IA review.**

This is a calm, intelligence-focused **sample-data mockup** — not an application,
not a live feed, and not AI-generated narrative copy.

---

## What shipped

| Item | Location |
| --- | --- |
| Interactive static mockup | `/side-trails/signalterrain/mockups/dashboard.html` |
| Screenshot gallery | `/side-trails/signalterrain/mockups/screenshots.html` |
| Screenshot assets | `assets/images/signalterrain/mockups/*.svg` |
| Styles | `design-system/css/wds-signalterrain-dashboard-mockup.css` |

### Top panel

**What changed today?** — sample briefing list with times.

### Panels included

- Current Threat Level  
- Latest Attacks  
- Zero-Day Activity  
- Ransomware Campaigns  
- CISA KEV Updates  
- Vendor Advisories  
- World Attack Map  
- Timeline  
- Newest Threat Actors  
- Today's Defensive Priorities  
- Recent CVEs  
- Critical Infrastructure Alerts  
- Latest Cyber News  

### Screenshots

| File | Subject |
| --- | --- |
| `dashboard-full.svg` | Full board |
| `what-changed-today.svg` | Top panel |
| `world-attack-map.svg` | Map schematic |
| `priorities-actors-news.svg` | Priorities / actors / news |

---

## Honesty notes

- Persistent **SAMPLE DATA · MOCKUP ONLY** banner.
- CVE / actor / campaign labels use explicit `SAMPLE` naming — no fake attribution to real groups.
- Empty / low-confidence rows kept honest where appropriate.
- No fake AI wording.
- No JS application behavior.

---

## Tests

```bash
node automation/test-signalterrain-dashboard-mockup.mjs
```

---

## Risks / remaining

1. Owner may want denser or quieter panel set before any future implementation.
2. Map markers are schematic; a future product must never imply live geolocation without evidence.
3. Implementation is explicitly out of scope for this branch.

---

## Recommendation

**Approve for design direction.** Do not merge as product functionality — mockup only.
