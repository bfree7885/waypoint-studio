# Cyber Seasons

**Catalog:** `cyber-seasons.json`  
**Runtime:** `detectSeason()`

---

## Idea

Long-term educational framing: “What kind of season are we in?”

Not prediction. Not threat theater.

---

## Season catalog (V1)

| Id | Label |
|----|-------|
| `season_ransomware` | Major ransomware activity |
| `season_supply_chain` | Supply chain campaigns |
| `season_patch_tuesday` | Patch Tuesday / vendor patch window |
| `season_cloud_outage` | Large cloud outages |
| `season_identity` | Identity-focused attacks |
| `season_browser` | Critical browser vulnerabilities |
| `season_quiet` | Quieter window |

Detection in V1 is **signal presence** over sample entity text/kinds (or a manual demo hint). Narrative always states educational detection, not forecast.

Seasons bias posture focus and optional hygiene recommendations (backups, patch review) — never offensive content.
