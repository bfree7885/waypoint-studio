# Owner Review — SignalTerrain Intelligence Map

**Date:** 2026-08-06  
**Branch:** `feature/signalterrain-intelligence-map-design`  
**Base:** `feature/signalterrain-posture-engine-arch` (`dbd0f55`)  
**Product:** SignalTerrain  
**Deployed:** No  
**Merged:** No  
**Implementation:** None — design documentation only

---

## Verdict

**Approve the SignalTerrain Intelligence Map design for direction.**

The map is a calm, source-backed awareness surface for public cyber and
infrastructure signals. Clicking an incident opens a dossier (summary, evidence,
timeline, related CVEs, official advisories, news, defensive recommendations).
No offensive functionality. No implementation in this branch.

---

## What shipped

| Artifact | Path |
| --- | --- |
| Design | `docs/SIGNALTERRAIN-INTELLIGENCE-MAP.md` |
| Owner review | this document |

### Display layers specified

- Current attacks  
- Campaign spread  
- Threat actor activity  
- Infrastructure incidents  
- BGP events  
- DNS outages  
- Cloud outages  
- Geographic clustering  

### Incident dossier on click

Summary · Evidence · Timeline · Related CVEs · Official advisories · News · Defensive recommendations  

### Hard rules

- Marker requires evidence (or resolvable official advisory)  
- Coarse geography only; `neverPreciseVictim`  
- Empty sections stay honest  
- No exploit/offensive tooling  

---

## Relationship to Cyber Map V0.1

Intelligence Map **extends** the existing coarse-map principles in `CYBER-MAP.md`
with a fuller layer set and a mandatory dossier contract. It does not replace
ethics boundaries already documented there.

---

## Owner decisions requested

1. Keep mandatory coarse precision for all layers?  
2. Group BGP/DNS/cloud under an infrastructure toggle by default?  
3. Keep news below official advisories in dossier order?  
4. Cluster click → member list before single dossier?

---

## Recommendation

**Approve design.** Push-only review branch. Do not merge as product
functionality — documentation only.
