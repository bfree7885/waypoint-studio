# SignalTerrain Cyber — Technical Debt & V1.0 Roadmap

**As of:** Product Recovery Phase 2 (engine 1.2.0 / signal 2.0.0)

---

## Technical debt

| Item | Impact | Notes |
|------|--------|-------|
| Monolithic `live.json` | Slow loads on weak networks | Split brief vs full records |
| ATT&CK keyword heuristics | False positives possible | Need official mapping feed or suppress in UI until confirmed |
| Persona keyword matching | Coarse relevance | Needs user-confirmed profile + inventory fusion |
| Chrome RSS still noisy upstream | Extra advisory volume | Tighten security-only filter further |
| Azure status soft-ok | Incomplete outage fidelity | Prefer structured status API when stable |
| EPSS / MSRC / Apple / Cisco planned | Missing enterprise edges | Wire with rate-limit honesty |
| Threat-actor / malware-family feeds | Timeline filter incomplete | No fabrication — wait for authoritative sources |
| Client-side only personalization | No sync | Acceptable for Phase 2; accounts later |
| Narrative dedupe title-only | Misses paraphrases | Optional embedding/simhash later |
| Graph UI underused | Correlation lives in JSON | Surface “related” panel on record detail |

---

## Roadmap → Version 1.0

### Must ship

1. **EPSS** as optional probability factor (labeled)  
2. **MSRC / major vendor** advisory providers (live, not planned)  
3. **Related intelligence** panel from `correlation.json`  
4. **Artifact split** for fast Overview  
5. **Persona × inventory** joint ranking (still local-first)  
6. **Quality gate:** no live path can load samples (CI assert)

### Should ship

7. Confirmed ATT&CK mapping source (or hide heuristics behind advanced toggle)  
8. Weekly PDF/email brief export from `signal.briefings.weekly`  
9. Ops runbook automation (scheduled engine + health alerts)  
10. Search across history briefs

### Later

11. Multi-tenant profiles  
12. Private vulnerability intel connectors (customer-owned)  
13. Playbook automation hooks (ticketing) — careful: remain advisory  

---

## Product test (ongoing)

For every screen, ask:

1. Would a security analyst actually use this?  
2. Would a systems administrator understand this?  
3. Does this reduce workload?  
4. Does this reduce noise?  

If any answer is no — fix before adding features.  
