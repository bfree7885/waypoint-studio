# SignalTerrain Cyber — Priority Model

**Status:** Live v1 (+ Adaptive Defense v1)  
**Implementation:** `scripts/signalterrain-cyber-live-engine.mjs` (server score) + `scripts/cyber-signal/adaptive-defense.mjs` + `wds-signalterrain-cyber-live.js` (client profile re-score)

---

## Bands (0–100)

| Band | Score |
|------|-------|
| Immediate | ≥ 80 |
| High | 60–79 |
| Monitor | 35–59 |
| Informational | &lt; 35 |

---

## Adaptive Defense categories

Deterministic mapping from live factors + recommendation action:

| Category | Typical trigger |
|----------|-----------------|
| PATCH / UPDATE | Known exploited + patch/fix indicated (often CISA KEV) |
| MITIGATE | Known exploited without clear patch — reduce exposure / follow vendor mitigations |
| REVIEW | High priority / critical severity — confirm relevance to your stack |
| WATCH | Meaningful but not an interrupt for most environments |
| NO IMMEDIATE ACTION | Healthy status / low signal — routine hygiene only |

Every Adaptive Defense item includes: **Why this moved up**, **Evidence** (source URLs), **Affected products**, **Confidence**, **Last updated**, and general defensive steps. SignalTerrain does **not** inspect user devices.

---

## Factors (deterministic)

| Factor | Max | Notes |
|--------|-----|-------|
| KEV / known exploited | 35 | Official known-exploited evidence |
| Ransomware linked | 12 | When source asserts campaign use |
| Official exploitation evidence | 8 | vs reported (3) |
| CVSS / severity label | 18 | Technical severity ≠ personal exposure |
| Recency | 10 | 7 / 30 / 90 day tiers |
| Patch available | 6 | Including deadline proximity |
| Source authority | 5 | Official &gt; authoritative &gt; reporting |
| Confidence | 4 | Confirmed/high vs preliminary |
| Profile match | 18 | Exact 18 · vendor 8 · platform 5 · ambiguous 2 · none 0 |

Every scored record includes `priority.contributions[]` and a plain-language `explanation`.

---

## Why CVSS alone is insufficient

CVSS describes technical severity of a vulnerability class. It does not encode whether the user runs the product, whether exploitation is observed, whether a patch exists, or whether an official deadline applies. KEV and profile matching exist to separate **severity**, **exploitation**, and **relevance**.

---

## Limitations

- No EPSS until that provider is live  
- Profile matching can be ambiguous without versions  
- Vendor-level match is never treated as proof of exposure  
- Client re-score adjusts only profile factors; other weights stay from the live artifact  
- Adaptive Defense never claims device inspection; optional local inventory is browser-only  

See also legacy educational engine docs: [CYBER-PRIORITY-ENGINE.md](CYBER-PRIORITY-ENGINE.md).
